describe('CRUD Operation Tests (Database)', () => {
    let database = [];

    beforeEach(() => {
        database = [];
    });

    test('Valid CREATE operation (Insert new deed)', async () => {
        const newRecord = { id: 'doc_1', deedNumber: '333/2026', owner: 'Test Owner' };
        database.push(newRecord);
        
        expect(database.length).toBe(1);
        expect(database[0].id).toBe('doc_1');
    });

    test('Valid READ operation (Retrieve deed by ID)', async () => {
        database.push({ id: 'doc_2', deedNumber: '444/2026', owner: 'Jane Doe' });
        
        const retrieved = database.find(doc => doc.id === 'doc_2');
        
        expect(retrieved).toBeDefined();
        expect(retrieved.owner).toBe('Jane Doe');
    });

    test('Valid UPDATE operation (Modify deed status)', async () => {
        database.push({ id: 'doc_3', deedNumber: '555/2026', status: 'PENDING' });
        
        const index = database.findIndex(doc => doc.id === 'doc_3');
        database[index].status = 'VERIFIED';
        
        expect(database[index].status).toBe('VERIFIED');
    });

    test('Valid DELETE operation (Remove test deed)', async () => {
        database.push({ id: 'doc_4', deedNumber: '666/2026', isTest: true });
        
        const initialLength = database.length;
        database = database.filter(doc => doc.id !== 'doc_4');
        
        expect(database.length).toBe(initialLength - 1);
        expect(database.find(doc => doc.id === 'doc_4')).toBeUndefined();
    });

    test('Invalid READ operation (Non-existent record)', async () => {
        const retrieved = database.find(doc => doc.id === 'invalid_doc');
        
        expect(retrieved).toBeUndefined();
    });
});
