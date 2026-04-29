const path = require('path');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const { createModels } = require('@librechat/data-schemas');
const {
  AccessRoleIds,
  PrincipalType,
  ResourceType,
  EModelEndpoint,
} = require('librechat-data-provider');

require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });

const connect = require('./connect');
const { silentExit } = require('./helpers');
const db = require('~/models');
const { grantPermission } = require('~/server/services/PermissionService');

const AGENT_NAME = 'Criador de imagens';
const DEFAULT_MODEL = process.env.LPH_IMAGE_AGENT_MODEL || 'gemini-2.5-flash';
const DEFAULT_PROVIDER = process.env.LPH_IMAGE_AGENT_PROVIDER || EModelEndpoint.google;

const getOwnerEmail = () => {
  const emailArg = process.argv.find((arg) => arg.startsWith('--email='));
  return (emailArg?.split('=')[1] || process.env.LPH_AGENT_OWNER_EMAIL || process.argv[2] || '')
    .trim()
    .toLowerCase();
};

const getFallbackOwner = async () => {
  const User = mongoose.models.User;
  return await User.findOne({ role: 'ADMIN' })
    .lean()
    .then((user) => user || User.findOne().lean());
};

const buildAgentData = (user) => ({
  name: AGENT_NAME,
  description: 'Agente de uso geral para criar e editar imagens com a ferramenta Gemini Image.',
  instructions: [
    'Voce e um especialista em criacao e edicao de imagens.',
    'Quando o usuario pedir para gerar, criar, editar, modificar ou transformar uma imagem, use a ferramenta gemini_image_gen.',
    'Escreva prompts visuais claros, completos e especificos.',
    'Depois de gerar a imagem, responda de forma curta e diga que a imagem foi criada.',
  ].join('\n'),
  provider: DEFAULT_PROVIDER,
  model: DEFAULT_MODEL,
  model_parameters: {
    model: DEFAULT_MODEL,
  },
  tools: ['gemini_image_gen'],
  tool_resources: {},
  conversation_starters: [
    'Gere uma imagem quadrada de um dashboard comercial moderno.',
    'Crie uma imagem premium para uma campanha de vendas.',
    'Edite a imagem enviada mantendo a identidade visual.',
  ],
  category: 'general',
  author: user._id,
  authorName: user.name || user.username || user.email,
});

const ensureOwnerPermission = async ({ userId, agentId, resourceType, accessRoleId }) => {
  await grantPermission({
    principalType: PrincipalType.USER,
    principalId: userId,
    resourceType,
    resourceId: agentId,
    accessRoleId,
    grantedBy: userId,
  });
};

const grantOwnerPermissions = async ({ userId, agentId }) => {
  await Promise.all([
    ensureOwnerPermission({
      userId,
      agentId,
      resourceType: ResourceType.AGENT,
      accessRoleId: AccessRoleIds.AGENT_OWNER,
    }),
    ensureOwnerPermission({
      userId,
      agentId,
      resourceType: ResourceType.REMOTE_AGENT,
      accessRoleId: AccessRoleIds.REMOTE_AGENT_OWNER,
    }),
  ]);
};

const grantPublicPermissions = async ({ userId, agentId }) => {
  await Promise.all([
    grantPermission({
      principalType: PrincipalType.PUBLIC,
      principalId: null,
      resourceType: ResourceType.AGENT,
      resourceId: agentId,
      accessRoleId: AccessRoleIds.AGENT_VIEWER,
      grantedBy: userId,
    }),
    grantPermission({
      principalType: PrincipalType.PUBLIC,
      principalId: null,
      resourceType: ResourceType.REMOTE_AGENT,
      resourceId: agentId,
      accessRoleId: AccessRoleIds.REMOTE_AGENT_VIEWER,
      grantedBy: userId,
    }),
  ]);
};

const seedImageAgent = async () => {
  const ownerEmail = getOwnerEmail();

  await connect();
  Object.assign(mongoose.models, createModels(mongoose));
  await db.seedDatabase();

  const user = ownerEmail ? await db.findUser({ email: ownerEmail }) : await getFallbackOwner();
  if (!user) {
    console.red(
      ownerEmail
        ? `Usuario nao encontrado: ${ownerEmail}`
        : 'Nenhum usuario encontrado para ser dono tecnico do agente.',
    );
    return silentExit(1);
  }

  const agentData = buildAgentData(user);
  let agent = await db.getAgent({ name: AGENT_NAME });

  if (!agent) {
    agent = await db.createAgent({
      id: `agent_${nanoid()}`,
      ...agentData,
    });
    console.green(`Agente criado: ${AGENT_NAME}`);
  } else {
    agent = await db.updateAgent(
      { _id: agent._id },
      {
        ...agentData,
        updatedAt: new Date(),
      },
      {
        updatingUserId: user._id.toString(),
        forceVersion: true,
      },
    );
    console.green(`Agente atualizado: ${AGENT_NAME}`);
  }

  await grantOwnerPermissions({ userId: user._id, agentId: agent._id });
  await grantPublicPermissions({ userId: user._id, agentId: agent._id });

  console.white(`Dono tecnico: ${user.email}`);
  console.white('Acesso: publico para todos os usuarios');
  console.white(`Agent ID: ${agent.id}`);
  console.white(`Provider: ${DEFAULT_PROVIDER}`);
  console.white(`Model: ${DEFAULT_MODEL}`);
  console.white('Ferramentas: gemini_image_gen');

  await mongoose.disconnect();
  silentExit(0);
};

seedImageAgent().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  silentExit(1);
});
