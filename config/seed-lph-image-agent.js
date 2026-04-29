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

const LEGACY_GEMINI_AGENT_NAME = 'Criador de imagens';
const GEMINI_AGENT_NAME = 'Criador de imagens Gemini';
const OPENAI_AGENT_NAME = 'Criador de imagens OpenAI';

const imageAgents = [
  {
    name: GEMINI_AGENT_NAME,
    aliases: [LEGACY_GEMINI_AGENT_NAME],
    description: 'Agente de uso geral para criar e editar imagens com Gemini Image.',
    provider: process.env.LPH_GEMINI_IMAGE_AGENT_PROVIDER || EModelEndpoint.google,
    model: process.env.LPH_GEMINI_IMAGE_AGENT_MODEL || 'gemini-2.5-flash',
    tools: ['gemini_image_gen'],
    toolLabel: 'gemini_image_gen',
    instructions: [
      'Voce e um especialista em criacao e edicao de imagens usando Gemini.',
      'Quando o usuario pedir para gerar, criar, editar, modificar ou transformar uma imagem, use a ferramenta gemini_image_gen.',
      'Escreva prompts visuais claros, completos e especificos.',
      'Depois de gerar a imagem, responda de forma curta e diga que a imagem foi criada com Gemini.',
    ].join('\n'),
  },
  {
    name: OPENAI_AGENT_NAME,
    aliases: [],
    description: 'Agente de uso geral para criar imagens com OpenAI Images.',
    provider: process.env.LPH_OPENAI_IMAGE_AGENT_PROVIDER || EModelEndpoint.openAI,
    model: process.env.LPH_OPENAI_IMAGE_AGENT_MODEL || 'gpt-4o-mini',
    tools: ['image_gen_oai'],
    toolLabel: 'image_gen_oai',
    instructions: [
      'Voce e um especialista em criacao de imagens usando OpenAI Images.',
      'Quando o usuario pedir para gerar ou criar uma imagem nova, use a ferramenta image_gen_oai.',
      'Escreva prompts visuais claros, completos e especificos.',
      'Depois de gerar a imagem, responda de forma curta e diga que a imagem foi criada com OpenAI.',
    ].join('\n'),
  },
];

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

const buildAgentData = (user, preset) => ({
  name: preset.name,
  description: preset.description,
  instructions: preset.instructions,
  provider: preset.provider,
  model: preset.model,
  model_parameters: {
    model: preset.model,
  },
  tools: preset.tools,
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

const findExistingAgent = async (preset) => {
  const names = [preset.name, ...(preset.aliases || [])];
  const Agent = mongoose.models.Agent;
  return await Agent.findOne({ name: { $in: names } }).lean();
};

const seedOneImageAgent = async ({ user, preset }) => {
  const agentData = buildAgentData(user, preset);
  let agent = await findExistingAgent(preset);

  if (!agent) {
    agent = await db.createAgent({
      id: `agent_${nanoid()}`,
      ...agentData,
    });
    console.green(`Agente criado: ${preset.name}`);
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
    console.green(`Agente atualizado: ${preset.name}`);
  }

  await grantOwnerPermissions({ userId: user._id, agentId: agent._id });
  await grantPublicPermissions({ userId: user._id, agentId: agent._id });

  console.white(`- ${preset.name}`);
  console.white(`  Agent ID: ${agent.id}`);
  console.white(`  Provider: ${preset.provider}`);
  console.white(`  Model: ${preset.model}`);
  console.white(`  Ferramenta: ${preset.toolLabel}`);
};

const seedImageAgents = async () => {
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

  console.white(`Dono tecnico: ${user.email}`);
  console.white('Acesso: publico para todos os usuarios');

  for (const preset of imageAgents) {
    await seedOneImageAgent({ user, preset });
  }

  await mongoose.disconnect();
  silentExit(0);
};

seedImageAgents().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  silentExit(1);
});
