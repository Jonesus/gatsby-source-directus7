import { createRemoteFileNode } from 'gatsby-source-filesystem';
import Fetcher from './fetch';
import {
    info,
    warn,
    success,
    mapRelations,
    createNodesFromEntities,
    prepareNodes,
    prepareFileNodes,
    createNodesFromFiles,
    mapFilesToNodes,
} from './process';

exports.sourceNodes = async (
    { actions, store, cache, createNodeId },
    { url, project, email, password, targetStatus, defaultStatus, downloadFilesToLocal, removeWarning, removeInfo},
) => {
    info(`Started logging for ${'gatsby-source-directus7'.blue}.`);
    const { createNode } = actions;

    info('Directus data fetcher initializing...');
    info(`targetStatus is: ${targetStatus} `);
    let fetcher;
    try {
        fetcher = new Fetcher(url, project, email, password, targetStatus, defaultStatus );
        success('Connected to Directus!');
    } catch (e) {
        info('Failed to initialize Directus connection. Please check your gatsby-config.js');
        throw e;
    }
    try {
        await fetcher.init();
        success('Logged in to Directus!');
    } catch (e) {
        info('Failed to log in. Attempting to use public permission for Directus API...');
    }

    info('Fetching Directus file data...');
    const allFilesData = await fetcher.getAllFiles();
    success(`Found ${allFilesData.length.toString().yellow} files from Directus.`);

    info('Downloading Directus files to Gatsby build cache...');
    const nodeFilesData = prepareFileNodes(allFilesData);
    const nodeFiles = await createNodesFromFiles(nodeFilesData, createNode, async f =>
        createRemoteFileNode({
            url: f.data.full_url,
            store,
            cache,
            createNode,
            createNodeId,
        }), downloadFilesToLocal
    );
    if (nodeFiles.length === allFilesData.length) {
        success(`Downloaded all ${nodeFiles.length.toString().yellow} files from Directus!`);
    } else {
        warn(
            `skipped ${
                (allFilesData.length - nodeFiles.length).toString().yellow
            } files from downloading`
        );
    }

    info('Fetching Directus Collection data...');
    const allCollectionsData = await fetcher.getAllCollections();

    info('Fetching Directus Items data...');
    const entities = await fetcher.getAllEntities(allCollectionsData);

    info('Fetching Directus Relations data...');
    const relations = await fetcher.getAllRelations();

    success('Retrieved all data from Directus!');
    info('Directus data processing starting...');

    info('Mapping Directus relations to Items...');
    const nodeEntities = prepareNodes(entities);
    const relationMappedEntities = mapRelations(nodeEntities, relations, nodeFiles, removeWarning, removeInfo);

    info('Mapping Directus files to Items...');
    const mappedEntities = mapFilesToNodes(nodeFiles, allCollectionsData, relationMappedEntities, removeWarning, removeInfo);

    info('Generating GraphQL nodes...');
    await createNodesFromEntities(mappedEntities, createNode);

    success('All done!');
    info(`Ended logging for ${'gatsby-source-directus7'.blue}.`);
};
