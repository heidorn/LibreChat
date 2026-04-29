const express = require('express');
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const db = require('~/models');

const router = express.Router();
router.use(requireJwtAuth);

const getUserId = (req) => req?.user?.id;

router.get('/', async (req, res) => {
  try {
    const projects = await db.getProjects(getUserId(req));
    res.status(200).json({ projects });
  } catch (error) {
    logger.error('[projects] Error listing projects', error);
    res.status(500).json({ error: 'Error listing projects' });
  }
});

router.post('/', async (req, res) => {
  try {
    const project = await db.createProject(getUserId(req), req.body);
    res.status(201).json(project);
  } catch (error) {
    logger.error('[projects] Error creating project', error);
    res.status(400).json({ error: error.message || 'Error creating project' });
  }
});

router.get('/:projectId', async (req, res) => {
  try {
    const project = await db.getProject(getUserId(req), req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(200).json(project);
  } catch (error) {
    logger.error('[projects] Error getting project', error);
    res.status(500).json({ error: 'Error getting project' });
  }
});

router.patch('/:projectId', async (req, res) => {
  try {
    const project = await db.updateProject(getUserId(req), req.params.projectId, req.body);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(200).json(project);
  } catch (error) {
    logger.error('[projects] Error updating project', error);
    res.status(400).json({ error: error.message || 'Error updating project' });
  }
});

router.delete('/:projectId', async (req, res) => {
  try {
    const project = await db.archiveProject(getUserId(req), req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(200).json(project);
  } catch (error) {
    logger.error('[projects] Error archiving project', error);
    res.status(500).json({ error: 'Error archiving project' });
  }
});

router.get('/:projectId/conversations', async (req, res) => {
  try {
    const conversations = await db.getProjectConversations(getUserId(req), req.params.projectId);
    res.status(200).json({ conversations });
  } catch (error) {
    logger.error('[projects] Error listing project conversations', error);
    res.status(500).json({ error: 'Error listing project conversations' });
  }
});

router.post('/:projectId/conversations/link', async (req, res) => {
  try {
    const link = await db.linkProjectConversation(getUserId(req), {
      projectId: req.params.projectId,
      conversationId: req.body.conversationId,
      addedFrom: req.body.addedFrom,
      summary: req.body.summary,
    });
    res.status(201).json(link);
  } catch (error) {
    logger.error('[projects] Error linking conversation', error);
    res.status(400).json({ error: error.message || 'Error linking conversation' });
  }
});

router.delete('/:projectId/conversations/:conversationId', async (req, res) => {
  try {
    const link = await db.unlinkProjectConversation(
      getUserId(req),
      req.params.projectId,
      req.params.conversationId,
    );
    res.status(200).json(link ?? { ok: true });
  } catch (error) {
    logger.error('[projects] Error unlinking conversation', error);
    res.status(400).json({ error: error.message || 'Error unlinking conversation' });
  }
});

router.post('/from-conversation', async (req, res) => {
  try {
    const project = await db.createProjectFromConversation(getUserId(req), req.body);
    res.status(201).json(project);
  } catch (error) {
    logger.error('[projects] Error creating project from conversation', error);
    res.status(400).json({ error: error.message || 'Error creating project from conversation' });
  }
});

router.get('/:projectId/files', async (req, res) => {
  try {
    const files = await db.getProjectFiles(getUserId(req), req.params.projectId);
    res.status(200).json({ files });
  } catch (error) {
    logger.error('[projects] Error listing project files', error);
    res.status(500).json({ error: 'Error listing project files' });
  }
});

router.post('/:projectId/files', async (req, res) => {
  try {
    const file = await db.addProjectFile(getUserId(req), {
      ...req.body,
      projectId: req.params.projectId,
    });
    res.status(201).json(file);
  } catch (error) {
    logger.error('[projects] Error adding project file', error);
    res.status(400).json({ error: error.message || 'Error adding project file' });
  }
});

router.get('/:projectId/memories', async (req, res) => {
  try {
    const memories = await db.getProjectMemories(getUserId(req), req.params.projectId);
    res.status(200).json({ memories });
  } catch (error) {
    logger.error('[projects] Error listing project memories', error);
    res.status(500).json({ error: 'Error listing project memories' });
  }
});

router.post('/:projectId/memories', async (req, res) => {
  try {
    const memory = await db.addProjectMemory(getUserId(req), {
      ...req.body,
      projectId: req.params.projectId,
    });
    res.status(201).json(memory);
  } catch (error) {
    logger.error('[projects] Error adding project memory', error);
    res.status(400).json({ error: error.message || 'Error adding project memory' });
  }
});

router.delete('/:projectId/memories/:memoryId', async (req, res) => {
  try {
    const memory = await db.deleteProjectMemory(
      getUserId(req),
      req.params.projectId,
      req.params.memoryId,
    );
    res.status(200).json(memory ?? { ok: true });
  } catch (error) {
    logger.error('[projects] Error deleting project memory', error);
    res.status(400).json({ error: error.message || 'Error deleting project memory' });
  }
});

module.exports = router;
