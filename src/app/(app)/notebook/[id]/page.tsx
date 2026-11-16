import NotebookWorkspace from './NotebookWorkspace';

export const metadata = {
  title: 'Notebook',
  description: 'Your sources, your questions and the study material built from them.',
};

export default async function NotebookViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NotebookWorkspace notebookId={id} />;
}
