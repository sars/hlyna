import * as migration_20261010_140549_initial from './20261010_140549_initial';
import * as migration_20261010_141805_add_public_description from './20261010_141805_add_public_description';
import * as migration_20261010_164905_add_formats from './20261010_164905_add_formats';

export const migrations = [
  {
    up: migration_20261010_140549_initial.up,
    down: migration_20261010_140549_initial.down,
    name: '20261010_140549_initial',
  },
  {
    up: migration_20261010_141805_add_public_description.up,
    down: migration_20261010_141805_add_public_description.down,
    name: '20261010_141805_add_public_description',
  },
  {
    up: migration_20261010_164905_add_formats.up,
    down: migration_20261010_164905_add_formats.down,
    name: '20261010_164905_add_formats'
  },
];
