import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ShareProjectDialog from '@/sections/projects/ShareProjectDialog';
import { Card, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from '@/components/ui/drop-down-menu';

import axios from 'src/utils/axios';
import { useTranslate } from 'src/locales';
import { useDebounce } from '@/hooks/use-debounce';

type Project = {
  _id: string;
  title: string;
  description?: string;
  tags?: string[];
  updatedAt?: string;
};

export default function ProjectsListPage() {
  const { t } = useTranslate('navbar');
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [scope, setScope] = useState<'all' | 'mine' | 'shared'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [sort, setSort] = useState<'updated' | 'title'>('updated');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareProject, setShareProject] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      const res = await axios.get('/api/v1/projects', { params: { scope } });
      setProjects(res.data || []);
    };

    fetchProjects();
  }, [scope]);

  const filteredProjects = useMemo(() => {
    const q = (debouncedSearch || '').toLowerCase().trim();
    let list = projects.slice();
    if (q)
      list = list.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    if (sort === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else
      list.sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );
    return list;
  }, [projects, debouncedSearch, sort]);

  const createProject = async () => {
    if (!newTitle.trim()) {
      toast.error(t('pages.projects.validationTitleRequired', 'Please enter a project title'));
      return;
    }
    setCreating(true);
    try {
      const res = await axios.post('/api/v1/projects', { title: newTitle.trim() });
      setNewTitle('');
      setProjects((prev) => [res.data, ...prev]);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-2 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{t('pages.projects.title', 'Projects')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              'pages.projects.description',
              'All your projects in one place — quickly start, share and manage them.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder={t('pages.projects.searchPlaceholder', 'Search...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mr-2"
          />
          <Select value={scope} onValueChange={(v) => setScope(v as 'all' | 'mine' | 'shared')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('pages.projects.scopePlaceholder', 'Scope')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('pages.projects.scopeAll', 'All')}</SelectItem>
              <SelectItem value="mine">{t('pages.projects.scopeMine', 'Mine')}</SelectItem>
              <SelectItem value="shared">{t('pages.projects.scopeShared', 'Shared')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as 'updated' | 'title')}>
            <SelectTrigger className="w-[140px] ml-2">
              <SelectValue placeholder={t('pages.projects.sortPlaceholder', 'Sort')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">
                {t('pages.projects.sortUpdated', 'Last updated')}
              </SelectItem>
              <SelectItem value="title">{t('pages.projects.sortTitle', 'Title')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('pages.projects.countLabel', {
            count: filteredProjects.length,
            defaultValue: `${filteredProjects.length} projects`,
          })}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder={t('pages.projects.newProjectPlaceholder', 'New project')}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createProject();
            }}
            className="w-64"
          />
          <Button
            onClick={createProject}
            disabled={creating}
            aria-label={t('pages.projects.createProjectAria', 'Create project')}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('pages.projects.createProject', 'Create')}
          </Button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
          <h3 className="text-lg font-medium">
            {t('pages.projects.emptyTitle', 'No projects found')}
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            {t(
              'pages.projects.emptyDescription',
              'Create your first project or adjust search/filters.'
            )}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              onClick={() => {
                if (newTitle.trim()) createProject();
              }}
            >
              {t('pages.projects.emptyCreateButton', 'Create new project')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p) => (
            <Card
              key={p._id}
              className={cn(
                'group cursor-pointer border-border/60 bg-card text-card-foreground hover:border-border transition-colors relative overflow-hidden'
              )}
              onClick={() => navigate(`/projects/${p._id}`)}
            >
              {/* Actions Menu */}
              <div className="absolute right-3 top-3 z-10 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8"
                      aria-label={t('pages.projects.contextMenuAria', 'Actions')}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[160px]">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareProject({ id: p._id, title: p.title });
                        setShareOpen(true);
                      }}
                    >
                      {t('pages.projects.contextShare', 'Share')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(
                          `${window.location.origin}/projects/${p._id}`
                        );
                        toast.success(t('pages.projects.linkCopied', 'Link copied'));
                      }}
                    >
                      {t('pages.projects.contextCopyLink', 'Copy link')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(p.title || '');
                        toast.success(t('pages.projects.titleCopied', 'Title copied'));
                      }}
                    >
                      {t('pages.projects.contextCopyTitle', 'Copy title')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(t('pages.projects.confirmDelete', 'Delete project?')))
                          return;
                        try {
                          await axios.delete(`/api/v1/projects/${p._id}`);
                          setProjects((prev) => prev.filter((x) => x._id !== p._id));
                          toast.success(t('pages.projects.deleteSuccess', 'Project deleted'));
                        } catch (_) {
                          toast.error(t('pages.projects.deleteError', 'Failed to delete project'));
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />{' '}
                      {t('pages.projects.contextDelete', 'Delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Card Content */}
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3 pr-8">
                  <Avatar className="size-11 shrink-0">
                    <AvatarFallback className="text-sm font-medium">
                      {(p.title || 'P').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="text-base font-semibold leading-tight truncate">
                      {p.title}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground">
                      {t('pages.projects.updatedAtLabel', 'Updated')}{' '}
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {p.description || t('pages.projects.noDescription', 'No description')}
                </p>

                {/* Tags */}
                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs font-normal">
                        {tag}
                      </Badge>
                    ))}
                    {p.tags.length > 4 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-xs font-normal">
                            +{p.tags.length - 4}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{p.tags.join(', ')}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {shareProject && (
        <ShareProjectDialog
          open={shareOpen}
          onClose={() => {
            setShareOpen(false);
            setShareProject(null);
          }}
          projectId={shareProject.id}
          projectTitle={shareProject.title}
        />
      )}
    </div>
  );
}
