import { Form, Input, Select } from "antd";
import type { FormInstance } from "antd/es/form";
import { EXAM_LEVELS } from "@/api/schemas";
import { BaseFormModal } from "@/components/FormModal";

/** Form values differ from the API body: `password` is optional when editing. */
export type UserFormValues = {
  username: string;
  display_name: string;
  password?: string;
  current_level: (typeof EXAM_LEVELS)[number];
};

export type FormModalProps = {
  open: boolean;
  editingUser: { username: string } | null;
  form: FormInstance<UserFormValues>;
  confirmLoading: boolean;
  onCancel: () => void;
  onFinish: (values: UserFormValues) => void;
};

const LEVEL_OPTIONS = EXAM_LEVELS.map((level) => ({ value: level, label: level }));

export function FormModal({
  open,
  editingUser,
  form,
  confirmLoading,
  onCancel,
  onFinish,
}: FormModalProps) {
  return (
    <BaseFormModal<UserFormValues>
      open={open}
      title={editingUser ? "编辑用户" : "新建用户"}
      okText="确定"
      cancelText="取消"
      form={form}
      confirmLoading={confirmLoading}
      onCancel={onCancel}
      onFinish={onFinish}
    >
      <Form.Item
        name="username"
        label="用户名"
        rules={[{ required: true, message: "请输入用户名" }]}
      >
        <Input disabled={editingUser != null} autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="display_name"
        label="昵称"
        rules={[{ required: true, message: "请输入昵称" }]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="password"
        label="密码"
        rules={[
          ...(editingUser ? [] : [{ required: true, message: "请输入密码" }]),
          { min: 8, message: "密码至少 8 位" },
        ]}
        extra={editingUser ? "留空表示不修改密码；修改后该用户需重新登录" : "至少 8 位"}
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Form.Item name="current_level" label="当前级别" initialValue="N5">
        <Select options={LEVEL_OPTIONS} />
      </Form.Item>
    </BaseFormModal>
  );
}
