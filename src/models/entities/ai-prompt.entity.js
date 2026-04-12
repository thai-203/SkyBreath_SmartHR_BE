import { EntitySchema } from 'typeorm';

export const AiPromptEntity = new EntitySchema({
  name: 'AiPromptEntity',
  tableName: 'ai_prompts',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    promptKey: {
      name: 'prompt_key',
      type: 'varchar',
      length: 100,
      unique: true,
      nullable: false,
    },
    promptContent: {
      name: 'prompt_content',
      type: 'text',
      nullable: false,
    },
    description: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    status: {
      type: 'varchar',
      length: 20,
      default: 'ACTIVE',
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
    updatedAt: {
      name: 'updated_at',
      type: 'timestamp',
      updateDate: true,
    },
  },
});
