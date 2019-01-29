import createNodeHelpers from 'gatsby-node-helpers';
import Pluralize from 'pluralize';

const { createNodeFactory } = createNodeHelpers({
    typePrefix: `Directus`,
});

const COLLECTION_NODE_TYPE = `Collection`;
const FILE_NODE_TYPE = `File`;

/**
 * Removes unnecessary fields from the response
 */
const sanitizeDirectusFields = node => {
    return node;
};

export const CollectionNode = createNodeFactory(COLLECTION_NODE_TYPE, node => {
    return sanitizeDirectusFields(node);
});

export const FileNode = createNodeFactory(FILE_NODE_TYPE, node => {
    return sanitizeDirectusFields(node);
});

// A little wrapper for the createItemFactory to not have to import the gatsby-node-helpers in the main file
export const createCollectionItemFactory = (name, allFiles) => {
    return createNodeFactory(name, node => {
        const cleanNode = sanitizeDirectusFields(node);

        // For each property on each row, check if it's a "file" property. If it is, find the file object
        // from `gatsby-source-filesystem` and add the URL to the property's object
        Object.keys(cleanNode).forEach(key => {
            if (node[key] && node[key].meta && node[key].meta.type === 'item') {
                const itemName = node[key].data && node[key].data.name;
                const file = allFiles.find(
                    fileCandidate => fileCandidate.directus.name === itemName,
                );
                if (file) {
                    cleanNode[key].file___NODE = file.gatsby.id;
                }
            }
        });

        return node;
    });
};

/**
 * Transforms the table name into a Gatsby Node Type name
 * All this does, is making the first letter uppercase and singularizing it if possible.
 * Also, it checks if there's an exception to this name to use instead
 */
export const getNodeTypeNameForCollection = (name, exceptions) => {
    let nodeName = name;
    // If there's an exception for this name, use it instead
    // Otherwise, generate a new one
    if (
        exceptions !== undefined &&
        Object.keys(exceptions).length > 0 &&
        exceptions[nodeName] !== undefined
    ) {
        return exceptions[nodeName];
    }

    // If the name is plural, use the Pluralize plugin to try make it singular
    // This is to conform to the Gatsby convention of using singular names in their node types
    if (Pluralize.isPlural(nodeName)) {
        nodeName = Pluralize.singular(nodeName);
    }

    // Make the first letter upperace as per Gatsby's convention
    nodeName = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);

    return nodeName;
};
