import { prepareNodes, prepareFileNodes, mapRelations } from '../src/process';

// Mock data for relation testing
const entityData = {
    movies: [
        { id: 0, directusId: 0, name: 'Titanic', directors: 0 },
        { id: 1, directusId: 1, name: 'Romeo & Juliet', directors: 1 },
        { id: 2, directusId: 2, name: 'Bambi', directors: 1 },
        { id: 4, directusId: 4, name: 'Wall-E', directors: 0 },
    ],
    directors: [
        { id: 0, directusId: 0, name: 'John Smith' },
        { id: 1, directusId: 1, name: 'Mary Sue' },
    ],
};

const expectedData = {
    movies: [
        {
            id: 0,
            directusId: 0,
            name: 'Titanic',
            directors___NODE: 0,
        },
        {
            id: 1,
            directusId: 1,
            name: 'Romeo & Juliet',
            directors___NODE: 1,
        },
        {
            id: 2,
            directusId: 2,
            name: 'Bambi',
            directors___NODE: 1,
        },
        {
            id: 4,
            directusId: 4,
            name: 'Wall-E',
            directors___NODE: 0,
        },
    ],
    directors: [
        {
            id: 0,
            directusId: 0,
            name: 'John Smith',
            movies___NODE: [0, 4],
        },
        {
            id: 1,
            directusId: 1,
            name: 'Mary Sue',
            movies___NODE: [1, 2],
        },
    ],
};

describe('prepareNodes', () => {
    test('generates proper replacement IDs', () => {
        const data = {
            books: [
                { name: 'Cool beans', author: 'Smart fellow' },
                { name: 'Ducktales', author: 'Real human Being' },
            ],
        };

        prepareNodes(data).books.map(book => expect(book.id).toBe(`Directus__Book__${book.name}`));
    });
});

describe('prepareFileNodes', () => {
    test('generates file nodes properly', () => {
        const data = [{ id: 1, fileName: 'Funny picture' }, { id: 2, fileName: 'Best song' }];

        prepareFileNodes(data).map((file, i) => expect(file.id).toBe(`Directus__File__${i + 1}`));
    });
});

describe('mapRelations', () => {
    test('many-to-one works with proper relation', () => {
        const relationData = [
            {
                collection_many: 'movies',
                field_many: 'directors',
                collection_one: 'directors',
                field_one: null,
                junction_field: null,
            },
        ];

        const originalLog = console.log;
        console.log = jest.fn();
        const mappedEntities = mapRelations(entityData, relationData, []);
        console.log = originalLog;

        expect(mappedEntities).toStrictEqual(expectedData);
    });

    test('many-to-one attempts to fix broken "field_many"', () => {
        const relationData = [
            {
                collection_many: 'movies',
                field_many: null,
                collection_one: 'directors',
                field_one: null,
                junction_field: null,
            },
        ];

        const originalLog = console.log;
        console.log = jest.fn();
        const mappedEntities = mapRelations(entityData, relationData, []);
        console.log = originalLog;

        expect(mappedEntities).toStrictEqual(expectedData);
    });

    test('many-to-one fails gracefully with broken "collection_many"', () => {
        const relationData = [
            {
                collection_many: null,
                field_many: 'directors',
                collection_one: 'directors',
                field_one: null,
                junction_field: null,
            },
        ];

        const originalLog = console.log;
        console.log = jest.fn();
        const mappedEntities = mapRelations(entityData, relationData, []);
        console.log = originalLog;

        expect(mappedEntities).toStrictEqual(entityData);
    });

    test('one-to-many works with proper relation', () => {
        const relationData = [
            {
                collection_many: 'movies',
                field_many: 'directors',
                collection_one: 'directors',
                field_one: 'movies',
                junction_field: null,
            },
        ];

        const originalLog = console.log;
        console.log = jest.fn();
        const mappedEntities = mapRelations(entityData, relationData, []);
        console.log = originalLog;

        expect(mappedEntities).toStrictEqual(expectedData);
    });
});
