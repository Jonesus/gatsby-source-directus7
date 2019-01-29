import Fetcher from './fetch';
import {
    CollectionNode,
    FileNode,
    createCollectionItemFactory,
    getNodeTypeNameForCollection,
} from './process';
import Colors from 'colors'; // eslint-disable-line
import { createRemoteFileNode } from 'gatsby-source-filesystem';

exports.sourceNodes = async (
    { boundActionCreators, getNode, store, cache, createNodeId },
    { url, project, apiKey, email, password, nameExceptions },
) => {
    const { createNode } = boundActionCreators;

    // Initialize the Fetcher class with API key and URL
    const fetcher = new Fetcher(url, project, apiKey, email, password);

    /*
    console.log(`gatsby-source-directus`.cyan, 'Fetching Directus files data...');

    const allFilesData = await fetcher.getAllFiles();

    console.log(`gatsby-source-directus`.blue, 'success'.green, `Fetched`, allFilesData.length.toString().yellow, `files from Directus.`);
    console.log(`gatsby-source-directus`.cyan, 'Downloading Directus files...');

    let filesDownloaded = 0,
        allFiles = [];

    for (let fileData of allFilesData) {
        const fileNode = FileNode(fileData);
        let localFileNode

        try {
            localFileNode = await createRemoteFileNode({
                url: protocol + url + fileNode.url,
                store,
                cache,
                createNode,
                createNodeId,
                auth: _auth,
            })
        } catch (e) {
            console.error(`\ngatsby-source-directus`.blue, 'error'.red, `gatsby-source-directus: An error occurred while downloading the files.`, e);
        }

        if (localFileNode) {
            filesDownloaded++;
            fileNode.localFile___NODE = localFileNode.id;

            // When `gatsby-source-filesystem` creates the file nodes, all reference
            // to the original data source is wiped out. This object links the
            // directus reference (that's used by other objects to reference files)
            // to the gatsby reference (that's accessible in GraphQL queries). Then,
            // when each table row is created (in ./process.js), if a file is on a row
            // we find it in this array and put the Gatsby URL on the directus node.
            //
            // This is a hacky solution, but it does the trick for very basic raw file capture
            // TODO see if we can implement gatsby-transformer-sharp style queries
            allFiles.push({
                directus: fileNode,
                gatsby: localFileNode
            });
        }

        await createNode(fileNode);
    }

    if (filesDownloaded === allFilesData.length) {
        console.log(`gatsby-source-directus`.blue, 'success'.green, `Downloaded all`, filesDownloaded.toString().yellow, `files from Directus.`);
    } else {
        console.log(`gatsby-source-directus`.blue, `warning`.yellow, `skipped`, (filesDownloaded - allFilesData.length).toString().yellow, 'files from downloading');
    }
    */

    console.log(`gatsby-source-directus`.cyan, 'Fetching Directus tables data...');

    // Fetch all the tables with data from Directus in a raw format
    const allCollectionsData = await fetcher.getAllCollections();

    console.log(
        `gatsby-source-directus`.blue,
        'success'.green,
        `Fetched`,
        allCollectionsData.length.toString().yellow,
        `tables from Directus.`,
    );

    allCollectionsData.map(async collectionData => {
        const collectionNode = CollectionNode(collectionData);
        await createNode(collectionNode);
        let collectionItems = await fetcher.getItemsForCollection(collectionData.collection);
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
        let name = getNodeTypeNameForCollection(collectionData.collection, nameExceptions);
        console.log(
            `gatsby-source-directus`.blue,
            'info'.cyan,
            `Generating Directus${name} node type...`,
        );

        // We're creating a separate Item Type for every table
        let ItemNode = createCollectionItemFactory(name, []);

        if (collectionItems && collectionItems.length > 0) {
            // Get all the items for the table above and create a gatsby node for it
            for (let collectionItemData of collectionItems) {
                // Create a Table Item node based on the API response
                const collectionItemNode = ItemNode(collectionItemData, {
                    parent: collectionNode.id,
                });

                // Pass it to Gatsby to create a node
                await createNode(collectionItemNode);
            }
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
    });

    console.log('AFTER');
};
