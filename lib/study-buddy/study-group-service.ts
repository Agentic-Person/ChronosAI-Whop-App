/**
 * Study Group Service
 * Manages study group creation, membership, and discovery
 */

import { createClient } from '@/lib/utils/supabase-client';
import {
  StudyGroup,
  GroupMember,
  CreateGroupData,
  GroupDiscoveryFilters,
  ServiceResponse,
  GroupResponse,
} from './types';

export class StudyGroupService {
  /**
   * Create a new study group
   */
  async createGroup(
    creatorId: string,
    data: CreateGroupData
  ): Promise<GroupResponse> {
    const supabase = createClient();

    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          name: data.name,
          description: data.description,
          type: data.type,
          focus_module: data.focus_module,
          focus_project: data.focus_project,
          focus_topic: data.focus_topic,
          max_members: data.max_members,
          recruiting_status: data.recruiting_status,
          min_level: data.min_level,
          max_level: data.max_level,
          required_topics: data.required_topics || [],
          timezone: data.timezone,
          meeting_schedule: data.meeting_schedule,
          requirements: data.requirements,
          is_public: data.is_public !== false,
          start_date: data.start_date,
          end_date: data.end_date,
          min_weekly_check_ins: data.min_weekly_check_ins || 0,
          min_weekly_messages: data.min_weekly_messages || 0,
          created_by: creatorId,
          activity_score: 100,
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as first member with 'creator' role
      const { error: memberError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: group.id,
          student_id: creatorId,
          role: 'creator',
          status: 'active',
        });

      if (memberError) throw memberError;

      return { success: true, group };
    } catch (error: any) {
      console.error('Error creating study group:', error);
      throw new Error(error.message || 'Failed to create study group');
    }
  }

  /**
   * Join a study group
   */
  async joinGroup(
    groupId: string,
    studentId: string
  ): Promise<ServiceResponse> {
    const supabase = createClient();

    try {
      // Check if group is full
      const { count: memberCount } = await supabase
        .from('study_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'active');

      const { data: group } = await supabase
        .from('study_groups')
        .select('max_members, min_level, max_level, recruiting_status')
        .eq('id', groupId)
        .single();

      if (!group) throw new Error('Group not found');
      if (group.recruiting_status === 'closed')
        throw new Error('Group is not recruiting');
      if (memberCount && memberCount >= group.max_members) {
        throw new Error('Group is full');
      }

      // Check level requirements
      if (group.min_level || group.max_level) {
        const { data: student } = await supabase
          .from('students')
          .select('level')
          .eq('id', studentId)
          .single();

        if (student) {
          if (group.min_level && student.level < group.min_level) {
            throw new Error(`Minimum level ${group.min_level} required`);
          }
          if (group.max_level && student.level > group.max_level) {
            throw new Error(`Maximum level ${group.max_level} exceeded`);
          }
        }
      }

      // Add member
      const { error } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          student_id: studentId,
          role: 'member',
          status: 'active',
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error joining group:', error);
      throw new Error(error.message || 'Failed to join group');
    }
  }

  /**
   * Leave a study group
   */
  async leaveGroup(
    groupId: string,
    studentId: string
  ): Promise<ServiceResponse> {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('study_group_members')
        .update({
          status: 'left',
          left_at: new Date().toISOString(),
        })
        .eq('group_id', groupId)
        .eq('student_id', studentId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error leaving group:', error);
      throw new Error(error.message || 'Failed to leave group');
    }
  }

  /**
   * Get groups a student is a member of
   */
  async getMyGroups(studentId: string): Promise<StudyGroup[]> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('study_group_members')
        .select(
          `
          *,
          group:study_groups(*)
        `
        )
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((membership: any) => membership.group);
    } catch (error: any) {
      console.error('Error fetching my groups:', error);
      throw new Error(error.message || 'Failed to fetch groups');
    }
  }

  /**
   * Discover groups (browse/search)
   */
  async discoverGroups(
    filters?: GroupDiscoveryFilters
  ): Promise<StudyGroup[]> {
    const supabase = createClient();

    try {
      let query = supabase
        .from('study_groups')
        .select('*')
        .eq('recruiting_status', 'open')
        .eq('is_public', true)
        .order('activity_score', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.focusModule) {
        query = query.eq('focus_module', filters.focusModule);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error} = await query.limit(50);

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error discovering groups:', error);
      throw new Error(error.message || 'Failed to discover groups');
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('study_group_members')
        .select(
          `
          *,
          student:students(id, name, avatar_url, level)
        `
        )
        .eq('group_id', groupId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error fetching group members:', error);
      throw new Error(error.message || 'Failed to fetch group members');
    }
  }

  /**
   * Get group details with member count
   */
  async getGroupDetails(groupId: string): Promise<StudyGroup & { member_count: number }> {
    const supabase = createClient();

    try {
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      const { count } = await supabase
        .from('study_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'active');

      return {
        ...group,
        member_count: count || 0,
      };
    } catch (error: any) {
      console.error('Error fetching group details:', error);
      throw new Error(error.message || 'Failed to fetch group details');
    }
  }

  /**
   * Update group activity score (call periodically via background job)
   */
  async updateGroupActivityScore(groupId: string): Promise<void> {
    const supabase = createClient();

    try {
      // Get messages in last 7 days
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { count: recentMessages } = await supabase
        .from('group_chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .gte('created_at', sevenDaysAgo);

      // Get check-ins in last 7 days
      const { count: recentCheckIns } = await supabase
        .from('study_check_ins')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .gte('created_at', sevenDaysAgo);

      // Calculate score (simplified)
      const messageScore = Math.min(50, (recentMessages || 0) * 2);
      const checkInScore = Math.min(50, (recentCheckIns || 0) * 10);
      const activityScore = Math.round(messageScore + checkInScore);

      await supabase
        .from('study_groups')
        .update({ activity_score: activityScore })
        .eq('id', groupId);
    } catch (error: any) {
      console.error('Error updating group activity score:', error);
      // Don't throw - this is a background task
    }
  }

  /**
   * Recommend groups for a student based on their profile
   */
  async recommendGroups(
    studentId: string,
    limit: number = 5
  ): Promise<StudyGroup[]> {
    const supabase = createClient();

    try {
      const { data: student } = await supabase
        .from('students')
        .select('*, matching_preferences (*)')
        .eq('id', studentId)
        .single();

      if (!student) throw new Error('Student not found');

      // Get all open groups
      const { data: groups } = await supabase
        .from('study_groups')
        .select('*')
        .eq('recruiting_status', 'open')
        .eq('is_public', true)
        .order('activity_score', { ascending: false })
        .limit(50);

      if (!groups) return [];

      // Filter and score groups
      const scoredGroups = groups
        .map((group) => {
          let score = 0;

          // Module match
          if (
            group.focus_module &&
            Math.abs(group.focus_module - student.current_module) <= 1
          ) {
            score += 30;
          }

          // Level match
          if (group.min_level && group.max_level) {
            if (
              student.level >= group.min_level &&
              student.level <= group.max_level
            ) {
              score += 25;
            }
          } else {
            score += 10;
          }

          // Topic match
          if (
            student.matching_preferences &&
            group.required_topics.length > 0
          ) {
            const studentTopics =
              student.matching_preferences.interested_topics || [];
            const matches = studentTopics.filter((t: string) =>
              group.required_topics.includes(t)
            );
            score += matches.length * 10;
          }

          // Activity score
          score += group.activity_score * 0.15;

          return { group, score };
        })
        .filter(({ score }) => score > 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return scoredGroups.map(({ group }) => group);
    } catch (error: any) {
      console.error('Error recommending groups:', error);
      throw new Error(error.message || 'Failed to recommend groups');
    }
  }

  /**
   * Update group settings (creator only)
   */
  async updateGroup(
    groupId: string,
    creatorId: string,
    updates: Partial<CreateGroupData>
  ): Promise<ServiceResponse> {
    const supabase = createClient();

    try {
      // Verify creator
      const { data: group } = await supabase
        .from('study_groups')
        .select('created_by')
        .eq('id', groupId)
        .single();

      if (!group || group.created_by !== creatorId) {
        throw new Error('Unauthorized');
      }

      const { error } = await supabase
        .from('study_groups')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating group:', error);
      throw new Error(error.message || 'Failed to update group');
    }
  }

  /**
   * Delete/Archive a group (creator only)
   */
  async deleteGroup(
    groupId: string,
    creatorId: string
  ): Promise<ServiceResponse> {
    const supabase = createClient();

    try {
      // Verify creator
      const { data: group } = await supabase
        .from('study_groups')
        .select('created_by')
        .eq('id', groupId)
        .single();

      if (!group || group.created_by !== creatorId) {
        throw new Error('Unauthorized');
      }

      // Soft delete: set recruiting_status to closed and is_public to false
      const { error } = await supabase
        .from('study_groups')
        .update({
          recruiting_status: 'closed',
          is_public: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting group:', error);
      throw new Error(error.message || 'Failed to delete group');
    }
  }
}

/**
 * Singleton instance
 */
export const studyGroupService = new StudyGroupService();
