import { defineCollection, z } from 'astro:content';

const fuzzyDate = z.string().regex(
  /^\d{4}(-\d{2}(-\d{2})?)?$/,
  'Date must be YYYY, YYYY-MM, or YYYY-MM-DD',
);

const works = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    preservedTitle: z.string().optional(),
    year: fuzzyDate.optional(),
    medium: z.enum(['film', 'video', 'performance', 'sound', 'writing', 'event', 'installation', 'other']),
    role: z.string().optional(),
    venue: z.string().optional(),
    tags: z.array(z.string()).default([]),
    section: z.string().optional(),
    summary: z.string().optional(),
    featuredImage: z.string().optional(),
    gallery: z.array(z.object({
      src: z.string(),
      caption: z.string().optional(),
    })).default([]),
    vimeoId: z.string().optional(),
    vimeoPrivacy: z.enum(['public', 'unlisted', 'private']).default('public'),
    youtubeId: z.string().optional(),
    soundcloudUrl: z.string().optional(),
    bandcampEmbedUrl: z.string().optional(),
    status: z.enum(['draft', 'published', 'featured']).default('draft'),
    featuredOrder: z.number().int().optional(),
    archivePath: z.string().optional(),
    rightsNote: z.string().optional(),
    substackUrl: z.string().url().optional(),
  }),
});

export const collections = { works };
