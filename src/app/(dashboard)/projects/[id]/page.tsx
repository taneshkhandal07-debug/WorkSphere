import React from 'react';
import { ProjectDetailClient } from '@/components/projects/ProjectDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ProjectDetailsPage({ params }: PageProps) {
  const { id } = await params;
  
  return <ProjectDetailClient projectId={id} />;
}
