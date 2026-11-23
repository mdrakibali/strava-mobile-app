import { Context } from 'hono';
import { z } from 'zod';
import { getDb } from '../lib/db';
import { HttpError, parseBody } from '../lib/http';
import {
  activityPatchSchema,
  legacyCreateSchema,
  uploadBatchSchema,
  uploadCompleteSchema,
  uploadStartSchema,
} from '../lib/validation';
import { ActivityRepository } from '../repositories/activity.repository';
import { syncChallengeProgress } from '../repositories/challenge.repository';
import { AthleteRepository } from '../repositories/athlete.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { PrivacyZoneRepository } from '../repositories/privacy-zone.repository';
import { ActivityService } from '../services/activity.service';
import { UploadService } from '../services/upload.service';
import { Env } from '../types';

type C = Context<{ Bindings: Env }>;

const commentSchema = z.object({
  content: z.string().trim().min(1, 'Comment content cannot be empty').max(1000),
  parentCommentId: z.string().max(100).optional(),
});

/** Errors are thrown as HttpError and rendered by app.onError (consistent { error, code } bodies). */
export class ActivityController {
  private service(c: C) {
    const db = getDb(c);
    return new ActivityService(
      new ActivityRepository(db),
      new AthleteRepository(db),
      new PrivacyZoneRepository(db),
      new NotificationRepository(db)
    );
  }

  private uploads(c: C) {
    return new UploadService(getDb(c));
  }

  private param(c: C, name: string) {
    const v = c.req.param(name);
    if (!v) throw new HttpError(400, 'missing_param', `${name} is required`);
    return v;
  }

  // POST /activities — legacy single-request upload (201 created, 200 already existed)
  async create(c: C) {
    const body = await parseBody(c, legacyCreateSchema);
    const athleteId = c.get('user').athleteId;
    const { created, activity } = await this.service(c).createLegacy(athleteId, body);
    if (created) await syncChallengeProgress(getDb(c), athleteId);
    return c.json(
      { message: created ? 'Activity uploaded' : 'Activity already uploaded', activity },
      created ? 201 : 200
    );
  }

  // GET /activities/:id
  async getDetail(c: C) {
    return c.json(
      await this.service(c).getActivityDetail(this.param(c, 'id'), c.get('user')?.athleteId)
    );
  }

  // PATCH /activities/:id
  async update(c: C) {
    const patch = await parseBody(c, activityPatchSchema);
    const athleteId = c.get('user').athleteId;
    const detail = await this.service(c).update(this.param(c, 'id'), athleteId, patch);
    await syncChallengeProgress(getDb(c), athleteId);
    return c.json(detail);
  }

  // DELETE /activities/:id
  async remove(c: C) {
    const athleteId = c.get('user').athleteId;
    await this.service(c).delete(this.param(c, 'id'), athleteId);
    await syncChallengeProgress(getDb(c), athleteId);
    return c.body(null, 204);
  }

  // POST /activities/:id/kudos (give-only, idempotent)
  async giveKudos(c: C) {
    const user = c.get('user');
    return c.json(
      await this.service(c).giveKudos(this.param(c, 'id'), user.athleteId, user.username)
    );
  }

  // DELETE /activities/:id/kudos (idempotent)
  async removeKudos(c: C) {
    return c.json(await this.service(c).removeKudos(this.param(c, 'id'), c.get('user').athleteId));
  }

  // GET /activities/:id/kudos
  async listKudos(c: C) {
    return c.json(await this.service(c).listKudos(this.param(c, 'id'), c.get('user')?.athleteId));
  }

  // GET /activities/:id/comments
  async listComments(c: C) {
    return c.json(
      await this.service(c).listComments(this.param(c, 'id'), c.get('user')?.athleteId)
    );
  }

  // PATCH /activities/:id/comments/:commentId (author only)
  async editComment(c: C) {
    const body = await parseBody(c, commentSchema.pick({ content: true }));
    const comment = await this.service(c).editComment(
      this.param(c, 'id'),
      this.param(c, 'commentId'),
      c.get('user').athleteId,
      body.content
    );
    return c.json({ comment });
  }

  // DELETE /activities/:id/comments/:commentId (author or activity owner)
  async deleteComment(c: C) {
    return c.json(
      await this.service(c).deleteComment(
        this.param(c, 'id'),
        this.param(c, 'commentId'),
        c.get('user').athleteId
      )
    );
  }

  // POST /activities/:id/comments
  async addComment(c: C) {
    const user = c.get('user');
    const body = await parseBody(c, commentSchema);
    const result = await this.service(c).addComment(
      this.param(c, 'id'),
      user.athleteId,
      user.username,
      body.content,
      body.parentCommentId
    );
    return c.json(
      { message: 'Comment posted', comment: result.comment, commentsCount: result.commentsCount },
      201
    );
  }

  // GET /activities/:id/export (owner only)
  async exportGpx(c: C) {
    const id = this.param(c, 'id');
    const gpx = await this.service(c).generateGpx(id, c.get('user').athleteId);
    c.header('Content-Type', 'application/gpx+xml; charset=utf-8');
    c.header(
      'Content-Disposition',
      `attachment; filename="activity_${id.replace(/[^\w-]/g, '')}.gpx"`
    );
    return c.body(gpx);
  }

  // ---- Batch uploads -------------------------------------------------------------------------

  // POST /activities/uploads
  async startUpload(c: C) {
    const body = await parseBody(c, uploadStartSchema);
    const { created, upload } = await this.uploads(c).start(c.get('user').athleteId, body);
    return c.json({ upload }, created ? 201 : 200);
  }

  // GET /activities/uploads/:cid
  async getUpload(c: C) {
    return c.json(await this.uploads(c).get(c.get('user').athleteId, this.param(c, 'cid')));
  }

  // PUT /activities/uploads/:cid/batches/:seq
  async putBatch(c: C) {
    const seq = Number(this.param(c, 'seq'));
    const body = await parseBody(c, uploadBatchSchema);
    return c.json(
      await this.uploads(c).putBatch(
        c.get('user').athleteId,
        this.param(c, 'cid'),
        seq,
        body.points
      )
    );
  }

  // POST /activities/uploads/:cid/complete (201 created, 200 already completed)
  async completeUpload(c: C) {
    const body = await parseBody(c, uploadCompleteSchema);
    const athleteId = c.get('user').athleteId;
    const result = await this.uploads(c).complete(athleteId, this.param(c, 'cid'), body);
    if (result.created) await syncChallengeProgress(getDb(c), athleteId);
    const {
      clientActivityId: _cid,
      rawPolyline: _raw,
      ...activity
    } = result.activity ?? ({} as any);
    return c.json(
      {
        created: result.created,
        deleted: result.deleted,
        activity: result.activity ? activity : null,
      },
      result.created ? 201 : 200
    );
  }
}
