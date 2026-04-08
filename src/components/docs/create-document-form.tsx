import { createDocumentAction } from "@/app/actions/documents";
import { SubmitButton } from "@/components/ui/submit-button";

type CreateDocumentFormProps = {
  parentId?: string;
};

export function CreateDocumentForm({
  parentId,
}: CreateDocumentFormProps) {
  return (
    <form action={createDocumentAction} className="space-y-3">
      <input type="hidden" name="parentId" value={parentId ?? ""} />
      <input
        name="title"
        type="text"
        placeholder="未命名文档"
        autoFocus
        className="input-field focus-ring"
      />
      <SubmitButton className="w-full justify-center" pendingLabel="创建中...">
        {parentId ? "新建子页面" : "新建文档"}
      </SubmitButton>
    </form>
  );
}
