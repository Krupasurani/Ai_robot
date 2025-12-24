import type { AgentTemplate } from 'src/types/agent';

import React, { useMemo, useState } from 'react';
import {
  Cog,
  X,
  Pencil,
  Brain,
  Trash2,
  Search,
  User,
  Sparkles,
  FileText,
  MoreVertical,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/utils/cn';

// import { TEMPLATE_CATEGORIES } from '../utils/agent';

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: AgentTemplate) => void;
  onEdit?: (template: AgentTemplate) => void;
  onDelete?: (template: AgentTemplate) => void;
  templates: AgentTemplate[];
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onClose,
  onSelect,
  onEdit,
  onDelete,
  templates,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeTemplate, setActiveTemplate] = useState<AgentTemplate | null>(null);

  // Filter templates with safe array handling
  const filteredTemplates = useMemo(() => {
    if (!Array.isArray(templates)) {
      return [];
    }

    return templates.filter((template) => {
      if (!template) return false;

      const matchesSearch =
        !searchQuery ||
        (template.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(template.tags) &&
          template.tags.some(
            (tag) => tag && tag.toLowerCase().includes(searchQuery.toLowerCase())
          ));

      const matchesCategory = !selectedCategory || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  // Get categories with counts - safe handling
  // const categoriesWithCounts = useMemo(() => {
  //   if (!Array.isArray(templates)) {
  //     return [];
  //   }

  //   const counts = templates.reduce(
  //     (acc, template) => {
  //       if (template && template.category) {
  //         acc[template.category] = (acc[template.category] || 0) + 1;
  //       }
  //       return acc;
  //     },
  //     {} as Record<string, number>
  //   );

  //   return TEMPLATE_CATEGORIES.map((category) => ({
  //     name: category,
  //     count: counts[category] || 0,
  //   })).filter((cat) => cat.count > 0);
  // }, [templates]);

  const handleTemplateSelect = (template: AgentTemplate) => {
    onSelect(template);
  };

  const handleMenuOpen = (template: AgentTemplate) => {
    setActiveTemplate(template);
  };

  const handleMenuClose = () => {
    setActiveTemplate(null);
  };

  const handleEdit = () => {
    if (activeTemplate) {
      if (onEdit) {
        onEdit(activeTemplate);
      }
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (activeTemplate) {
      if (onDelete) {
        onDelete(activeTemplate);
      }
    }
    handleMenuClose();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedCategory('');
  };

  const renderTemplateCard = (template: AgentTemplate) => {
    if (!template || !template._key) {
      return null;
    }

    // Get template icon based on category or type
    const getTemplateIcon = (tmpl: AgentTemplate) => {
      const category = tmpl.category?.toLowerCase() || '';
      const tags = tmpl.tags || [];

      if (category.includes('support') || tags.includes('customer-support')) {
        return User;
      }
      if (category.includes('analysis') || tags.includes('data-analysis')) {
        return Brain;
      }
      if (category.includes('automation') || tags.includes('automation')) {
        return Cog;
      }
      if (category.includes('creative') || tags.includes('content-creation')) {
        return Sparkles;
      }

      return FileText;
    };

    const TemplateIcon = getTemplateIcon(template);

    return (
      <div key={template._key} className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-4">
        <Card
          className={cn(
            'h-full min-h-[320px] flex flex-col cursor-pointer transition-all duration-200',
            'hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5'
          )}
          onClick={() => handleTemplateSelect(template)}
        >
          {/* Header Section */}
          <div className="p-4 border-b border-border bg-muted/30 relative">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 bg-primary/10 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10">
                  <TemplateIcon className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm leading-tight mb-1 truncate">
                  {template.name || 'Unnamed Template'}
                </h3>
                <Badge variant="outline" className="h-[18px] text-[0.65rem]">
                  {template.category || 'General'}
                </Badge>
              </div>

              {/* Menu Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuOpen(template);
                    }}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={() => {
                      if (activeTemplate) handleTemplateSelect(activeTemplate);
                      handleMenuClose();
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Use Template
                  </DropdownMenuItem>
                  {onEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Template
                    </DropdownMenuItem>
                  )}
                  <Separator />
                  {onDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Template
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Content Section */}
          <CardContent className="p-4 flex flex-col flex-1 gap-3">
            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 min-h-[3.15em]">
              {template.description || 'No description available'}
            </p>

            {/* Tags */}
            {Array.isArray(template.tags) && template.tags.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="h-4 text-[0.6rem]">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 3 && (
                    <Badge variant="outline" className="h-4 text-[0.6rem] text-muted-foreground">
                      +{template.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-auto pt-3 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTemplateSelect(template);
                }}
              >
                Use Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
          {/* Header */}
          <DialogTitle className="flex items-center justify-between p-6 pb-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 bg-primary/10 border border-primary/20">
                <AvatarFallback className="bg-primary/10">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-lg text-foreground">Choose a Template</h2>
                <p className="text-xs text-muted-foreground">
                  Start with a pre-built agent template
                </p>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>

          {/* Search and Filters */}
          <div className="p-6 pb-4 border-b border-border">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleClearSearch}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {Array.isArray(filteredTemplates) ? filteredTemplates.length : 0} template
                {(Array.isArray(filteredTemplates) ? filteredTemplates.length : 0) !== 1
                  ? 's'
                  : ''}{' '}
                found
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {!Array.isArray(filteredTemplates) || filteredTemplates.length === 0 ? (
              <div className="p-12 text-center bg-primary/5 border border-primary/20 rounded-lg">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="mt-4 mb-2 text-lg font-semibold text-foreground">
                  No templates found
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || selectedCategory
                    ? 'Try adjusting your search criteria or filters'
                    : 'No templates available yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-4">
                {filteredTemplates.map(renderTemplateCard).filter(Boolean)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TemplateSelector;
