describe('DeedGuard Home', () => {
  it('loads login screen and allows role selection', () => {
    cy.visit('/');
    cy.contains('DeedGuard');
    cy.get('button').contains('Citizen').click();
    cy.get('button').contains('Registrar').should('exist');
  });
});
