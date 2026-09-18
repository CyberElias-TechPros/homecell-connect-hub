import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { json } from '../lib/http';
import { requireUser } from '../auth';
import { getUserScope, getAccessibleHomecellIds, inClause } from '../lib/scope';

/**
 * Returns the organisational slice a signed-in user is allowed to see.
 * Row-level filtering happens in SQL so a user never receives data for a
 * branch of the hierarchy their role does not cover.
 */
const hierarchy = new Hono<AppEnv>();

hierarchy.get('/', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);

  const homecellFilter = allowed === null ? null : inClause(allowed);

  const cells = await c.env.DB
    .prepare(
      `SELECT h.id, h.name, h.code, h.address, h.meeting_day AS meetingDay, h.meeting_time AS meetingTime,
              h.timezone, h.meeting_link AS meetingLink, h.meeting_platform AS meetingPlatform,
              h.is_active AS isActive,
              h.leader_id AS leaderId, lu.name AS leaderName,
              h.assistant_id AS assistantId, au.name AS assistantName,
              h.provider_id AS providerId, pu.name AS providerName,
              z.id AS zoneId, z.name AS zoneName,
              a.id AS areaId, a.name AS areaName,
              d.id AS districtId, d.name AS districtName,
              (SELECT COUNT(*) FROM users m WHERE m.homecell_id = h.id AND m.status = 'active') AS memberCount
         FROM homecells h
         JOIN zones z     ON z.id = h.zone_id
         JOIN areas a     ON a.id = z.area_id
         JOIN districts d ON d.id = a.district_id
         LEFT JOIN users lu ON lu.id = h.leader_id
         LEFT JOIN users au ON au.id = h.assistant_id
         LEFT JOIN users pu ON pu.id = h.provider_id
        ${homecellFilter ? `WHERE h.id IN ${homecellFilter.sql}` : ''}
        ORDER BY h.name`,
    )
    .bind(...(homecellFilter?.bindings ?? []))
    .all();

  // Zones / areas / districts are derived from the cells the user can reach,
  // which is simpler and safer than a second set of scope rules.
  const zoneIds = [...new Set(cells.results.map((r) => (r as { zoneId: string }).zoneId))];
  const areaIds = [...new Set(cells.results.map((r) => (r as { areaId: string }).areaId))];
  const districtIds = [...new Set(cells.results.map((r) => (r as { districtId: string }).districtId))];

  const [zones, areas, districts] = await Promise.all([
    zoneIds.length
      ? c.env.DB
          .prepare(
            `SELECT z.id, z.name, z.code, z.area_id AS areaId, z.zonal_leader_id AS leaderId,
                    u.name AS leaderName,
                    (SELECT COUNT(*) FROM homecells h WHERE h.zone_id = z.id) AS homecellCount
               FROM zones z LEFT JOIN users u ON u.id = z.zonal_leader_id
              WHERE z.id IN (${zoneIds.map(() => '?').join(',')}) ORDER BY z.name`,
          )
          .bind(...zoneIds)
          .all()
      : Promise.resolve({ results: [] }),
    areaIds.length
      ? c.env.DB
          .prepare(
            `SELECT a.id, a.name, a.code, a.district_id AS districtId,
                    a.coordinator_id AS coordinatorId, u.name AS coordinatorName,
                    (SELECT COUNT(*) FROM zones z WHERE z.area_id = a.id) AS zoneCount
               FROM areas a LEFT JOIN users u ON u.id = a.coordinator_id
              WHERE a.id IN (${areaIds.map(() => '?').join(',')}) ORDER BY a.name`,
          )
          .bind(...areaIds)
          .all()
      : Promise.resolve({ results: [] }),
    districtIds.length
      ? c.env.DB
          .prepare(
            `SELECT d.id, d.name, d.code, d.overseer_id AS overseerId, u.name AS overseerName,
                    (SELECT COUNT(*) FROM areas a WHERE a.district_id = d.id) AS areaCount
               FROM districts d LEFT JOIN users u ON u.id = d.overseer_id
              WHERE d.id IN (${districtIds.map(() => '?').join(',')}) ORDER BY d.name`,
          )
          .bind(...districtIds)
          .all()
      : Promise.resolve({ results: [] }),
  ]);

  return json(
    {
      scope: scope.level,
      homecells: cells.results,
      zones: zones.results,
      areas: areas.results,
      districts: districts.results,
    },
    requestId,
  );
});

/** A single cell with everything a member dashboard needs. */
hierarchy.get('/homecell/:id', async (c) => {
  const requestId = c.get('requestId');
  const user = requireUser(c);
  const scope = await getUserScope(c.env.DB, user);
  const allowed = await getAccessibleHomecellIds(c.env.DB, scope);
  const id = c.req.param('id');

  if (allowed !== null && !allowed.includes(id)) {
    const { ApiError } = await import('../lib/errors');
    throw ApiError.forbidden('You do not have access to this homecell.');
  }

  const cell = await c.env.DB
    .prepare(
      `SELECT h.*, lu.name AS leaderName, au.name AS assistantName, pu.name AS providerName,
              z.name AS zoneName, a.name AS areaName, d.name AS districtName
         FROM homecells h
         JOIN zones z     ON z.id = h.zone_id
         JOIN areas a     ON a.id = z.area_id
         JOIN districts d ON d.id = a.district_id
         LEFT JOIN users lu ON lu.id = h.leader_id
         LEFT JOIN users au ON au.id = h.assistant_id
         LEFT JOIN users pu ON pu.id = h.provider_id
        WHERE h.id = ?`,
    )
    .bind(id)
    .first();

  if (!cell) {
    const { ApiError } = await import('../lib/errors');
    throw ApiError.notFound('Homecell not found.');
  }

  return json({ homecell: cell }, requestId);
});

export default hierarchy;
