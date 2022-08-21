import { Opaque } from 'type-fest';

export type DalleId = Opaque<'DalleId', string>;

export interface DalleObject {
  id: DalleId;
  created: number;
}

export interface DalleList<T> {
  object: 'list';

  data: T[];
}
