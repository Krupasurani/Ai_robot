interface RecordTypesProps {
  title: string;
  type: string;
}

export default function RecordTypes({ title, type }: RecordTypesProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground font-medium">{title}</p>
      <p className="text-base text-foreground">{type}</p>
    </div>
  );
}
