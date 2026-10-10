import * as migration_20261010_140549_initial from './20261010_140549_initial';

export const migrations = [
  {
    up: migration_20261010_140549_initial.up,
    down: migration_20261010_140549_initial.down,
    name: '20261010_140549_initial'
  },
];
