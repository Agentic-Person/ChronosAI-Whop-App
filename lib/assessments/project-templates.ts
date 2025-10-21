/**
 * Project Template System
 * Pre-built project scaffolds for students
 */

import { supabase } from '@/lib/utils/supabase-client';
import { logger } from '@/lib/infrastructure/monitoring/logger';

// =====================================================
// Types
// =====================================================

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  starter_code?: string;
  acceptance_criteria: string[];
  rubric: RubricItem[];
  technologies: string[];
  estimated_hours?: number;
  learning_objectives: string[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RubricItem {
  category: string;
  points: number;
  criteria: string;
}

export interface Project {
  id: string;
  student_id: string;
  template_id?: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'revision_requested';
  due_date?: string;
  custom_requirements?: any;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectOptions {
  templateId?: string;
  studentId: string;
  title?: string;
  description?: string;
  dueDate?: string;
  customRequirements?: any;
}

// =====================================================
// Template Management
// =====================================================

/**
 * Get all active project templates
 */
export async function getProjectTemplates(
  category?: string,
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
): Promise<ProjectTemplate[]> {
  try {
    let query = supabase
      .from('project_templates')
      .select('*')
      .eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to fetch project templates', { error, category, difficulty });
    return [];
  }
}

/**
 * Get a single project template by ID
 */
export async function getProjectTemplate(templateId: string): Promise<ProjectTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Failed to fetch project template', { error, template_id: templateId });
    return null;
  }
}

/**
 * Create a custom project template (for creators)
 */
export async function createProjectTemplate(
  templateData: Partial<ProjectTemplate>
): Promise<ProjectTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('project_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) throw error;

    logger.info('Project template created', { template_id: data.id });
    return data;
  } catch (error) {
    logger.error('Failed to create project template', { error });
    return null;
  }
}

/**
 * Update a project template
 */
export async function updateProjectTemplate(
  templateId: string,
  updates: Partial<ProjectTemplate>
): Promise<ProjectTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('project_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;

    logger.info('Project template updated', { template_id: templateId });
    return data;
  } catch (error) {
    logger.error('Failed to update project template', { error, template_id: templateId });
    return null;
  }
}

/**
 * Deactivate a project template
 */
export async function deactivateProjectTemplate(templateId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_templates')
      .update({ is_active: false })
      .eq('id', templateId);

    if (error) throw error;

    logger.info('Project template deactivated', { template_id: templateId });
    return true;
  } catch (error) {
    logger.error('Failed to deactivate project template', { error, template_id: templateId });
    return false;
  }
}

// =====================================================
// Project Management
// =====================================================

/**
 * Create a project from a template
 */
export async function createProjectFromTemplate(
  options: CreateProjectOptions
): Promise<Project | null> {
  try {
    let projectData: Partial<Project> = {
      student_id: options.studentId,
      status: 'not_started',
      created_at: new Date().toISOString(),
    };

    if (options.templateId) {
      // Load template
      const template = await getProjectTemplate(options.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      projectData = {
        ...projectData,
        template_id: options.templateId,
        title: options.title || template.title,
        description: options.description || template.description,
      };
    } else {
      // Custom project without template
      if (!options.title) {
        throw new Error('Title is required for custom projects');
      }

      projectData = {
        ...projectData,
        title: options.title,
        description: options.description,
        custom_requirements: options.customRequirements,
      };
    }

    if (options.dueDate) {
      projectData.due_date = options.dueDate;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) throw error;

    logger.info('Project created', {
      project_id: data.id,
      student_id: options.studentId,
      template_id: options.templateId,
    });

    return data;
  } catch (error) {
    logger.error('Failed to create project', { error, options });
    return null;
  }
}

/**
 * Get projects for a student
 */
export async function getStudentProjects(
  studentId: string,
  status?: string
): Promise<Project[]> {
  try {
    let query = supabase
      .from('projects')
      .select('*')
      .eq('student_id', studentId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to fetch student projects', { error, student_id: studentId });
    return [];
  }
}

/**
 * Get a single project
 */
export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Failed to fetch project', { error, project_id: projectId });
    return null;
  }
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  projectId: string,
  status: Project['status']
): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    logger.info('Project status updated', { project_id: projectId, status });
    return data;
  } catch (error) {
    logger.error('Failed to update project status', { error, project_id: projectId });
    return null;
  }
}

/**
 * Update project
 */
export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    logger.info('Project updated', { project_id: projectId });
    return data;
  } catch (error) {
    logger.error('Failed to update project', { error, project_id: projectId });
    return null;
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;

    logger.info('Project deleted', { project_id: projectId });
    return true;
  } catch (error) {
    logger.error('Failed to delete project', { error, project_id: projectId });
    return false;
  }
}

// =====================================================
// Template Categories and Filtering
// =====================================================

/**
 * Get all available categories
 */
export async function getTemplateCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('project_templates')
      .select('category')
      .eq('is_active', true);

    if (error) throw error;

    // Get unique categories
    const categories = [...new Set(data?.map(t => t.category) || [])];
    return categories;
  } catch (error) {
    logger.error('Failed to fetch template categories', { error });
    return [];
  }
}

/**
 * Get template counts by category and difficulty
 */
export async function getTemplateStats(): Promise<{
  total: number;
  by_category: Record<string, number>;
  by_difficulty: Record<string, number>;
}> {
  try {
    const { data, error } = await supabase
      .from('project_templates')
      .select('category, difficulty')
      .eq('is_active', true);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      by_category: {} as Record<string, number>,
      by_difficulty: {} as Record<string, number>,
    };

    data?.forEach(template => {
      // Count by category
      stats.by_category[template.category] =
        (stats.by_category[template.category] || 0) + 1;

      // Count by difficulty
      stats.by_difficulty[template.difficulty] =
        (stats.by_difficulty[template.difficulty] || 0) + 1;
    });

    return stats;
  } catch (error) {
    logger.error('Failed to fetch template stats', { error });
    return {
      total: 0,
      by_category: {},
      by_difficulty: {},
    };
  }
}

/**
 * Get recommended templates for a student based on their progress
 */
export async function getRecommendedTemplates(
  studentId: string
): Promise<ProjectTemplate[]> {
  try {
    // Get student's completed projects to determine skill level
    const { data: completedProjects } = await supabase
      .from('projects')
      .select('template_id, project_templates(difficulty, category)')
      .eq('student_id', studentId)
      .eq('status', 'graded');

    // Determine recommended difficulty
    let recommendedDifficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';

    if (completedProjects && completedProjects.length > 0) {
      const hasAdvanced = completedProjects.some(
        (p: any) => p.project_templates?.difficulty === 'advanced'
      );
      const hasIntermediate = completedProjects.some(
        (p: any) => p.project_templates?.difficulty === 'intermediate'
      );

      if (hasAdvanced) {
        recommendedDifficulty = 'advanced';
      } else if (hasIntermediate || completedProjects.length >= 3) {
        recommendedDifficulty = 'intermediate';
      }
    }

    // Get templates at recommended difficulty
    const templates = await getProjectTemplates(undefined, recommendedDifficulty);

    // Filter out already completed templates
    const completedTemplateIds = new Set(
      completedProjects?.map((p: any) => p.template_id).filter(Boolean) || []
    );

    return templates.filter(t => !completedTemplateIds.has(t.id)).slice(0, 5);
  } catch (error) {
    logger.error('Failed to get recommended templates', { error, student_id: studentId });
    return [];
  }
}
