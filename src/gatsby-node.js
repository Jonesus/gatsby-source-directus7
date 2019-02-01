import { createRemoteFileNode } from 'gatsby-source-filesystem';
import Fetcher from './fetch';
import {
    mapRelations,
    createNodesFromEntities,
    prepareNodes,
    prepareFileNodes,
    createNodesFromFiles,
    mapFilesToNodes,
} from './process';
import Colors from 'colors'; // eslint-disable-line

exports.sourceNodes = async (
    { actions, store, cache, createNodeId },
    { url, project, email, password, nameExceptions },
) => {
    const { createNode } = actions;

    // Initialize the Fetcher class with API key and URL
    const fetcher = new Fetcher(url, project, email, password);
    await fetcher.init();

    console.log(`gatsby-source-directus`.cyan, 'Fetching Directus files data...');

    const allFilesData = await fetcher.getAllFiles();
    console.log(JSON.stringify(allFilesData, null, 2));

    console.log(
        `gatsby-source-directus`.blue,
        'success'.green,
        `Fetched`,
        allFilesData.length.toString().yellow,
        `files from Directus.`,
    );
    console.log(`gatsby-source-directus`.cyan, 'Downloading Directus files...');

    const nodeFilesData = prepareFileNodes(allFilesData);
    const nodeFiles = await createNodesFromFiles(nodeFilesData, createNode, async f =>
        createRemoteFileNode({
            url: f.data.full_url,
            store,
            cache,
            createNode,
            createNodeId,
        }),
    );

    if (nodeFiles.length === allFilesData.length) {
        console.log(
            `gatsby-source-directus`.blue,
            'success'.green,
            `Downloaded all`,
            nodeFiles.length.toString().yellow,
            `files from Directus.`,
        );
    } else {
        console.log(
            `gatsby-source-directus`.blue,
            `warning`.yellow,
            `skipped`,
            (allFilesData.length - nodeFiles.length).toString().yellow,
            'files from downloading',
        );
    }

    console.log(`gatsby-source-directus`.cyan, 'Fetching Directus tables data...');

    // Fetch all the tables with data from Directus in a raw format
    const allCollectionsData = await fetcher.getAllCollections();
    console.log(JSON.stringify(allCollectionsData, null, 2));

    const entities = await fetcher.getAllEntities(allCollectionsData);
    const relations = await fetcher.getAllRelations();
    const nodeEntities = prepareNodes(entities);
    const relationMappedEntities = mapRelations(nodeEntities, relations);

    const mappedEntities = mapFilesToNodes(nodeFiles, allCollectionsData, relationMappedEntities);

    //console.log(entities);
    //console.log(relations);
    console.log(JSON.stringify(mappedEntities, null, 2));
    await createNodesFromEntities(mappedEntities, createNode);

    /*
    console.log(
        `gatsby-source-directus`.blue,
        'success'.green,
        `Fetched`,
        allCollectionsData.length.toString().yellow,
        `tables from Directus.`,
    );

    await Promise.all(
        allCollectionsData.map(async collectionData => {
            const collectionNode = CollectionNode(collectionData);
            await createNode(collectionNode);
            const collectionItems = await fetcher.getItemsForCollection(collectionData.collection);
            console.log(
                `gatsby-source-directus`.blue,
                'success'.green,
                `Fetched`,
                collectionItems.length.toString().cyan,
                `items for `,
                collectionData.collection.cyan,
                ` table...`,
            );

            // Get the name for this node type
            const name = getNodeTypeNameForCollection(collectionData.collection, nameExceptions);
            console.log(
                `gatsby-source-directus`.blue,
                'info'.cyan,
                `Generating Directus${name} node type...`,
            );

            // We're creating a separate Item Type for every table
            const ItemNode = createCollectionItemFactory(name, allFiles);

            if (collectionItems && collectionItems.length > 0) {
                // Get all the items for the table above and create a gatsby node for it
                collectionItems.map(async collectionItemData => {
                    // Create a Table Item node based on the API response
                    const collectionItemNode = ItemNode(collectionItemData, {
                        parent: collectionNode.id,
                    });
                    console.log(collectionItemNode);

                    // Pass it to Gatsby to create a node
                    await createNode(collectionItemNode);
                });
                console.log(
                    `gatsby-source-directus`.blue,
                    `success`.green,
                    `Directus${name} node generated`,
                );
            } else {
                console.log(
                    `gatsby-source-directus`.blue,
                    `warning`.yellow,
                    `${collectionData.collection} table has no rows. Skipping...`,
                );
            }
        }),
    );
    */
    console.log('gatsby-source-directus'.blue, 'success'.green, 'All done!');
};
