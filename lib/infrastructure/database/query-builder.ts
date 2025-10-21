/**
 * Type-Safe Query Builder
 * Provides common query patterns with type safety and performance optimizations
 */

import { getSupabaseClient, getSupabaseAdmin, executeWithRetry } from './connection-pool';
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  /** Column to order by */
  orderBy?: string;
  /** Sort direction */
  orderDirection?: 'asc' | 'desc';
  /** Number of items per page */
  limit?: number;
  /** Cursor value for pagination */
  cursor?: string;
}

/**
 * Query filter options
 */
export interface QueryFilters {
  [key: string]: any;
}

/**
 * Paginated query result
 */
export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Optimized query builder with common patterns
 */
export class QueryBuilder<T extends TableName> {
  constructor(
    private table: T,
    private useAdmin = false
  ) {}

  private get client() {
    return this.useAdmin ? getSupabaseAdmin() : getSupabaseClient();
  }

  /**
   * Get single record by ID with type safety
   */
  async getById(
    id: string,
    select = '*'
  ): Promise<Tables[T]['Row'] | null> {
    const { data, error } = await executeWithRetry(() =>
      this.client.from(this.table).select(select).eq('id', id).single()
    );

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch ${String(this.table)} by ID: ${error.message}`);
    }

    return data;
  }

  /**
   * Get multiple records by IDs
   */
  async getByIds(
    ids: string[],
    select = '*'
  ): Promise<Tables[T]['Row'][]> {
    if (ids.length === 0) return [];

    const { data, error } = await executeWithRetry(() =>
      this.client.from(this.table).select(select).in('id', ids)
    );

    if (error) {
      throw new Error(`Failed to fetch ${String(this.table)} by IDs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Paginated list with cursor-based pagination
   * More efficient than offset-based pagination for large datasets
   */
  async list(options: {
    select?: string;
    filters?: QueryFilters;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedResult<Tables[T]['Row']>> {
    let query = this.client.from(this.table).select(options.select || '*');

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply cursor pagination
    if (options.cursor && options.orderBy) {
      const direction = options.orderDirection || 'asc';
      query = query[direction === 'asc' ? 'gt' : 'lt'](
        options.orderBy,
        options.cursor
      );
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.orderDirection !== 'desc',
      });
    }

    // Fetch one extra to check if there are more results
    const limit = options.limit || 50;
    query = query.limit(limit + 1);

    const { data, error } = await executeWithRetry(() => query);

    if (error) {
      throw new Error(`Failed to list ${String(this.table)}: ${error.message}`);
    }

    const results = data || [];
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    const nextCursor =
      hasMore && items.length > 0 && options.orderBy
        ? (items[items.length - 1] as any)[options.orderBy]
        : null;

    return {
      data: items,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Count records matching filters
   */
  async count(filters?: QueryFilters): Promise<number> {
    let query = this.client.from(this.table).select('*', { count: 'exact', head: true });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await executeWithRetry(() => query);

    if (error) {
      throw new Error(`Failed to count ${String(this.table)}: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Insert single record
   */
  async insert(
    row: Tables[T]['Insert']
  ): Promise<Tables[T]['Row']> {
    const { data, error } = await executeWithRetry(() =>
      this.client.from(this.table).insert(row).select().single()
    );

    if (error) {
      throw new Error(`Failed to insert into ${String(this.table)}: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Insert returned no data for ${String(this.table)}`);
    }

    return data;
  }

  /**
   * Batch insert with type safety
   * More efficient than multiple single inserts
   */
  async insertMany(
    rows: Tables[T]['Insert'][]
  ): Promise<Tables[T]['Row'][]> {
    if (rows.length === 0) return [];

    const { data, error } = await executeWithRetry(() =>
      this.client.from(this.table).insert(rows).select()
    );

    if (error) {
      throw new Error(`Failed to batch insert into ${String(this.table)}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update record by ID
   */
  async update(
    id: string,
    updates: Tables[T]['Update']
  ): Promise<Tables[T]['Row']> {
    const { data, error } = await executeWithRetry(() =>
      this.client
        .from(this.table)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
    );

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`Record not found in ${String(this.table)}: ${id}`);
      }
      throw new Error(`Failed to update ${String(this.table)}: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Update returned no data for ${String(this.table)}`);
    }

    return data;
  }

  /**
   * Update with optimistic locking using version field
   * Prevents concurrent modification issues
   */
  async updateWithVersion(
    id: string,
    updates: Tables[T]['Update'],
    expectedVersion: number
  ): Promise<Tables[T]['Row']> {
    // Increment version in updates
    const updatesWithVersion = {
      ...updates,
      version: expectedVersion + 1,
    } as any;

    const { data, error } = await executeWithRetry(() =>
      this.client
        .from(this.table)
        .update(updatesWithVersion)
        .eq('id', id)
        .eq('version', expectedVersion)
        .select()
        .single()
    );

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Optimistic lock failed - record was modified by another process');
      }
      throw new Error(`Failed to update ${String(this.table)}: ${error.message}`);
    }

    if (!data) {
      throw new Error('Optimistic lock failed - no record updated');
    }

    return data;
  }

  /**
   * Batch update records matching filters
   */
  async updateMany(
    filters: QueryFilters,
    updates: Tables[T]['Update']
  ): Promise<Tables[T]['Row'][]> {
    let query = this.client.from(this.table).update(updates);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await executeWithRetry(() => query.select());

    if (error) {
      throw new Error(`Failed to batch update ${String(this.table)}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete record by ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await executeWithRetry(() =>
      this.client.from(this.table).delete().eq('id', id)
    );

    if (error) {
      throw new Error(`Failed to delete from ${String(this.table)}: ${error.message}`);
    }
  }

  /**
   * Batch delete records matching filters
   */
  async deleteMany(filters: QueryFilters): Promise<number> {
    let query = this.client.from(this.table).delete();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { count, error } = await executeWithRetry(() =>
      query.select('*', { count: 'exact', head: true })
    );

    if (error) {
      throw new Error(`Failed to batch delete from ${String(this.table)}: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Upsert (insert or update) record
   */
  async upsert(
    row: Tables[T]['Insert'],
    onConflict?: string
  ): Promise<Tables[T]['Row']> {
    const options = onConflict ? { onConflict } : {};

    const { data, error } = await executeWithRetry(() =>
      this.client.from(this.table).upsert(row, options).select().single()
    );

    if (error) {
      throw new Error(`Failed to upsert into ${String(this.table)}: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Upsert returned no data for ${String(this.table)}`);
    }

    return data;
  }

  /**
   * Check if record exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const { count, error } = await executeWithRetry(() =>
      this.client
        .from(this.table)
        .select('id', { count: 'exact', head: true })
        .eq('id', id)
    );

    if (error) {
      throw new Error(`Failed to check existence in ${String(this.table)}: ${error.message}`);
    }

    return (count || 0) > 0;
  }
}

/**
 * Factory function to create query builders
 */
export function createQueryBuilder<T extends TableName>(
  table: T,
  useAdmin = false
): QueryBuilder<T> {
  return new QueryBuilder(table, useAdmin);
}
