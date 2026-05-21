interface NewAttribute {
  status: "new";
  name: string;
  description?: string;
  icon: Buffer | null;
  users_id: number;
}

interface AttributeInDatabase {
  status: "saved";
  id: number;
  name: string;
  description?: string;
  icon: Buffer | null;
  users_id: number;
  level: number | null;
  xp: number | null;
  xp_to_next_level: number;
  decay_date: Date | null;
}

// 1. Union interfaces
type Attribute = NewAttribute | AttributeInDatabase;

// 2. Explicit type export as default
export type { Attribute as default, AttributeInDatabase, NewAttribute };

export type AttributesLvlsPerUser = {
  userId: number;
  attributeLevels: number[];
};
