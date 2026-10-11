import * as migration_20261010_140549_initial from './20261010_140549_initial';
import * as migration_20261010_141805_add_public_description from './20261010_141805_add_public_description';
import * as migration_20261010_164905_add_formats from './20261010_164905_add_formats';
import * as migration_20261010_181452_add_instagram_posts from './20261010_181452_add_instagram_posts';
import * as migration_20261010_190427_add_alternate_names from './20261010_190427_add_alternate_names';
import * as migration_20261010_194941_add_geo from './20261010_194941_add_geo';
import * as migration_20261011_052428_request_studio_type from './20261011_052428_request_studio_type';
import * as migration_20261011_093108_studio_owners_claims from './20261011_093108_studio_owners_claims';
import * as migration_20261011_094618_owner_text_fields from './20261011_094618_owner_text_fields';

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
    name: '20261010_164905_add_formats',
  },
  {
    up: migration_20261010_181452_add_instagram_posts.up,
    down: migration_20261010_181452_add_instagram_posts.down,
    name: '20261010_181452_add_instagram_posts',
  },
  {
    up: migration_20261010_190427_add_alternate_names.up,
    down: migration_20261010_190427_add_alternate_names.down,
    name: '20261010_190427_add_alternate_names',
  },
  {
    up: migration_20261010_194941_add_geo.up,
    down: migration_20261010_194941_add_geo.down,
    name: '20261010_194941_add_geo',
  },
  {
    up: migration_20261011_052428_request_studio_type.up,
    down: migration_20261011_052428_request_studio_type.down,
    name: '20261011_052428_request_studio_type',
  },
  {
    up: migration_20261011_093108_studio_owners_claims.up,
    down: migration_20261011_093108_studio_owners_claims.down,
    name: '20261011_093108_studio_owners_claims',
  },
  {
    up: migration_20261011_094618_owner_text_fields.up,
    down: migration_20261011_094618_owner_text_fields.down,
    name: '20261011_094618_owner_text_fields'
  },
];
