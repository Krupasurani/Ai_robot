import type { IChatAttachment } from 'src/types/chat';

import { useBoolean } from 'src/hooks/use-boolean';
import { fDateTime } from 'src/utils/format-time';
import { cn } from '@/utils/cn';
import { CollapseButton } from './chat-toggle-buttons';
import { Image } from '@/components/custom/image';

function FileThumbnail({ file, imageView, onDownload, slotProps, className, ...props }: any) {
  const previewUrl = typeof file === 'string' ? file : URL.createObjectURL(file);

  if (imageView) {
    return (
      <div className={cn('relative overflow-hidden rounded border', className)} {...props}>
        <Image src={previewUrl} alt="thumbnail" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      <Image src={previewUrl} alt="file" className="h-8 w-8 object-cover" />
    </div>
  );
}

type Props = {
  attachments: IChatAttachment[];
};

export function ChatRoomAttachments({ attachments }: Props) {
  const collapse = useBoolean(true);

  const totalAttachments = attachments.length;

  const renderList = attachments.map((attachment, index) => (
    <div
      key={attachment.name + index}
      className="flex items-center gap-3 rounded-lg bg-muted/40 px-2.5 py-1.5"
    >
      <FileThumbnail
        imageView
        file={attachment.preview}
        onDownload={() => console.info('DOWNLOAD')}
        slotProps={{ icon: { width: 24, height: 24 } }}
        className="w-10 h-10 bg-background/neutral"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{attachment.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {fDateTime(attachment.createdAt)}
        </p>
      </div>
    </div>
  ));

  return (
    <>
      <CollapseButton
        selected={collapse.value}
        disabled={!totalAttachments}
        onClick={collapse.onToggle}
      >
        {`Attachments (${totalAttachments})`}
      </CollapseButton>

      {!!totalAttachments && collapse.value && <div className="space-y-2 p-2">{renderList}</div>}
    </>
  );
}
