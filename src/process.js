import createNodeHelpers from 'gatsby-node-helpers';
import Pluralize from 'pluralize';

const { createNodeFactory } = createNodeHelpers({
    typePrefix: 'Directus',
});

const FILE_NODE_TYPE = `File`;

const containsNullValue = obj => Object.keys(obj).some(key => obj[key] === null);

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

/**
 * Calls a node creation helper on each item
 */
export const prepareNodes = entities => {
    const newEntities = entities;
    Object.keys(entities).forEach(entity => {
        const name = getNodeTypeNameForCollection(entity, []);
        const generateItemNode = createNodeFactory(name);
        newEntities[entity] = newEntities[entity].map(item => generateItemNode(item));
    });
    return newEntities;
};

/**
 * Maps all relations between Directus entities. First we traverse
 * through every relation, and form Many-To-Ones straight away while
 * gathering up all Many-To-Many relations. Afterwards we can iterate
 * over each Many-To-Many relation and build the correct GraphQL nodes.
 */
export const mapRelations = (entities, relations) => {
    const mappedEntities = entities;
    const junctionRelations = {};
    relations.forEach(relation => {
        if (relation.junction_field === null) {
            // Many-to-one, build the relation right away
            const co = relation.collection_one;
            const fo = relation.field_one;
            const cm = relation.collection_many;
            const fm = relation.field_many;
            console.log(
                'gatsby-source-directus'.blue,
                'info'.cyan,
                `Found One-To-Many relation: ${co} -> ${cm}`,
            );

            // Replace each "One" entity with one that contains relations
            // to "Many" entities
            mappedEntities[co] = mappedEntities[co].map(entity => ({
                ...entity,
                [`${fo}___NODE`]: mappedEntities[cm].map(e => e.id),
            }));

            // Same in reverse (each "Many" gets a "One")
            mappedEntities[cm] = mappedEntities[cm].map(entity => {
                const newEntity = {
                    ...entity,
                    [`${fm}___NODE`]: mappedEntities[co].find(e => e.directusId === entity[fm]).id,
                };
                delete newEntity[fm];
                return newEntity;
            });
        } else if (!containsNullValue(relation)) {
            // Many-to-many, need to find the pair relations before processing
            const cm = relation.collection_many;
            if (junctionRelations[cm] === undefined) {
                junctionRelations[cm] = [relation];
            } else {
                junctionRelations[cm].push(relation);
            }
        }
    });

    // Form the many-to-many relationships
    Object.keys(junctionRelations).forEach(junction => {
        const junctions = junctionRelations[junction];
        if (junctions.length !== 2) {
            console.error(
                '\ngatsby-source-directus'.blue,
                'error'.red,
                'gatsby-source-directus: Error while building relations for',
                junctions[0].collection_many,
                'please check your Directus configuration.',
            );
        }
        const firstCol = junctions[0].collection_one;
        const secondCol = junctions[1].collection_one;
        console.log(
            'gatsby-source-directus'.blue,
            'info'.cyan,
            `Found Many-To-Many relation: ${firstCol} <-> ${secondCol}`,
        );
        // Add relations to both directions
        junctions.forEach(j =>
            mappedEntities[j.collection_many].forEach(relation => {
                // Finds the correct entity and adds the id of related
                // item to the relation list
                const targetCol = j.collection_one;
                const anotherCol = targetCol === firstCol ? secondCol : firstCol;
                const targetItemId = relation[j.field_many];
                const targetKey = `${j.field_one}___NODE`;
                const targetVal = mappedEntities[anotherCol].find(
                    e => e.directusId === relation[j.junction_field],
                ).id;
                mappedEntities[targetCol] = mappedEntities[targetCol].map(item =>
                    item.directusId === targetItemId
                        ? {
                              ...item,
                              [targetKey]:
                                  item[targetKey] === undefined
                                      ? [targetVal]
                                      : [...item[targetKey], targetVal],
                          }
                        : item,
                );
            }),
        );
    });
    return mappedEntities;
};

/**
 * Calls Gatsby's createNode on each item in entities
 */
export const createNodesFromEntities = async (entities, createNode) => {
    Object.keys(entities).map(async entity => {
        await Promise.all(entities[entity].map(item => createNode(item)));
    });
};

/**
 * Removes unnecessary fields from the response
 */
const sanitizeDirectusFields = node => {
    return node;
};

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

        return cleanNode;
    });
};
