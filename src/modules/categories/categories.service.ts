import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';

export class CategoriesService {
  static async listCategories() {
    return prisma.courseCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    });
  }

  static async getCategoryBySlug(slug: string) {
    const category = await prisma.courseCategory.findUnique({
      where: { slug },
      include: {
        courses: {
          where: { status: 'PUBLISHED' },
          include: {
            teacher: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
            _count: {
              select: { enrollments: true, modules: true },
            },
          },
        },
      },
    });

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    return category;
  }

  static async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
  }) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await prisma.courseCategory.findUnique({
      where: { slug },
    });

    if (existing) {
      throw ApiError.conflict('A category with this name or slug already exists');
    }

    return prisma.courseCategory.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        icon: data.icon,
      },
    });
  }

  static async updateCategory(id: string, data: {
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
  }) {
    const category = await prisma.courseCategory.findUnique({ where: { id } });
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    return prisma.courseCategory.update({
      where: { id },
      data,
    });
  }

  static async deleteCategory(id: string) {
    const category = await prisma.courseCategory.findUnique({
      where: { id },
      include: { _count: { select: { courses: true } } },
    });

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    if (category._count.courses > 0) {
      throw ApiError.badRequest('Cannot delete category with associated courses');
    }

    return prisma.courseCategory.delete({ where: { id } });
  }
}
