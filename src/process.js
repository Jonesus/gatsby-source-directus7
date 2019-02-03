import createNodeHelpers from 'gatsby-node-helpers';
import Pluralize from 'pluralize';
import Colors from 'colors'; // eslint-disable-line

export const info = msg => console.log('gatsby-source-directus'.blue, 'info'.cyan, msg);
export const warn = msg => console.log('gatsby-source-directus'.blue, 'warning'.yellow, msg);
export const error = msg => console.error('gatsby-source-directus'.blue, 'error'.red, msg);
export const success = msg => console.log('gatsby-source-directus'.blue, 'success'.green, msg);

const { createNodeFactory } = createNodeHelpers({
    typePrefix: 'Directus',
});

/**
 * Transforms the table name into a Gatsby Node Type name
 * All this does, is making the first letter uppercase and singularizing it if possible.
 * Also, it checks if there's an exception to this name to use instead
 */
export const getNodeTypeNameForCollection = name => {
    let nodeName = name;
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
        const name = getNodeTypeNameForCollection(entity);
        const generateItemNode = createNodeFactory(name);
        newEntities[entity] = newEntities[entity].map(item => generateItemNode(item));
    });
    return newEntities;
};

/**
 * Calls a node creation helper on each file
 */
export const prepareFileNodes = files => {
    const generateFileNode = createNodeFactory('File');
    return files.map(generateFileNode);
};

/**
 * Calls both Gatsby's createNode and gatsby-source-filesystem's
 * createRemoteFileNode on them. Returns an object with both of them,
 * so that they can be linked into Directus's collections.
 */
export const createNodesFromFiles = (files, createNode, createRemoteFileNode) =>
    Promise.all(
        files.map(async f => {
            let localFileNode;
            try {
                localFileNode = await createRemoteFileNode(f);
            } catch (e) {
                error(`Error while downloading files: ${e}`);
            }
            if (localFileNode) {
                f.localFile___NODE = localFileNode.id;
                await createNode(f);
            }
            return {
                directus: f,
                gatsby: localFileNode,
            };
        }),
    );

// Helper for the next function
const containsNullValue = obj => Object.keys(obj).some(key => obj[key] === null);

/**
 * Maps all relations between Directus entities. First we traverse
 * through every relation, and form Many-To-Ones straight away while
 * gathering up all Many-To-Many relations. Afterwards we can iterate
 * over each Many-To-Many relation and build the correct GraphQL nodes.
 */
export const mapRelations = (entities, relations, files) => {
    const mappedEntities = entities;
    const junctionRelations = {};
    relations.forEach(relation => {
        if (relation.junction_field === null) {
            // Many-to-one, build the relation right away
            const co = relation.collection_one;
            const fo = relation.field_one;
            const cm = relation.collection_many;
            const fm = relation.field_many;
            info(`Found One-To-Many relation: ${co} -> ${cm}`);

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
        } else {
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
        let junctions = junctionRelations[junction];
        if (junctions.length % 2 !== 0) {
            error(
                'Error while building relations for ' +
                    `${junctions[0].collection_many}. ` +
                    'Please check your Directus Relations collection.',
            );
        }
        if (junctions.length >= 4) {
            // Directus Many-To-Many relational table entries get generated
            // in a weird fashion where there might be redundant entries.
            junctions = junctions.filter(j => !containsNullValue(j));
            if (junctions.length !== 2) {
                error(
                    'Error while building relations for ' +
                        `${junctions[0].collection_many}. ` +
                        'Please check your Directus Relations collection.',
                );
            }
        }
        const firstCol = junctions[0].collection_one;
        const secondCol = junctions[1].collection_one;
        info(`Found Many-To-Many relation: ${firstCol} <-> ${secondCol}`);
        if (junctions.some(containsNullValue)) {
            junctions = junctions.filter(j => !containsNullValue(j));
            warn(`Only ${junctions[0].collection_one} contains the relational field though.`);
        }
        // Add relations to both directions
        junctions.forEach(j =>
            mappedEntities[j.collection_many].forEach(relation => {
                // Finds the correct entity and adds the id of related
                // item to the relation list
                const targetCol = j.collection_one;
                const anotherCol = targetCol === firstCol ? secondCol : firstCol;
                const targetItemId = relation[j.field_many];
                const targetKey = `${j.field_one}___NODE`;
                let targetVal; // This gets tricky if the targets are files
                if (anotherCol === 'directus_files') {
                    targetVal = files.find(
                        f => f.directus.directusId === relation[j.junction_field],
                    ).gatsby.id;
                } else {
                    targetVal = mappedEntities[anotherCol].find(
                        e => e.directusId === relation[j.junction_field],
                    ).id;
                }
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

    // Remove junction collections as they don't contain relevant data to user anymore
    info('Cleaning junction collections...');
    Object.keys(junctionRelations).forEach(junction => {
        delete mappedEntities[junction];
    });
    return mappedEntities;
};

/**
 * Iterates through files served by Directus and maps them to all
 * the Collections's Items which are supposed to have an attachment.
 */
export const mapFilesToNodes = (files, collections, entities) => {
    const newEntities = entities;
    // Figure out which Collections have fields that need to be
    // mapped to files
    const collectionsWithFiles = [];
    collections.forEach(collection =>
        Object.keys(collection.fields).forEach(field => {
            if (collection.fields[field].type === 'file') {
                collectionsWithFiles.push({
                    collectionName: collection.collection,
                    fieldName: field,
                });
            }
        }),
    );

    // Map the right field in the right collection to a file node
    collectionsWithFiles.forEach(c => {
        info(`Mapping files for ${c.collectionName}...`);
        newEntities[c.collectionName] = newEntities[c.collectionName].map(e => {
            const targetFileId = e[c.fieldName];
            const fileId = files.find(f => f.directus.directusId === targetFileId).gatsby.id;
            return { ...e, [`${c.fieldName}___NODE`]: fileId };
        });
    });
    return newEntities;
};

/**
 * Calls Gatsby's createNode on each item in entities
 */
export const createNodesFromEntities = async (entities, createNode) => {
    Object.keys(entities).map(async entity => {
        await Promise.all(entities[entity].map(item => createNode(item)));
    });
};
