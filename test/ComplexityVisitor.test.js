import {
  introspectionQuery,
  parse,
  TypeInfo,
  ValidationContext,
  visit,
  visitWithTypeInfo,
} from 'graphql';

import { ComplexityVisitor } from '../src';

import schema from './fixtures/schema';

describe('ComplexityVisitor', () => {
  const typeInfo = new TypeInfo(schema);

  describe('simple queries', () => {
    it('should calculate the correct cost', () => {
      const ast = parse(`
        query {
          item {
            name
            item {
              name
            }
          }
          list {
            item {
              name
            }
            list {
              name
            }
          }
          nonNullItem {
            name
          }
          nonNullList {
            name
          }
        }
      `);

      const context = new ValidationContext(schema, ast, typeInfo);
      const visitor = new ComplexityVisitor(context, {});

      visit(ast, visitWithTypeInfo(typeInfo, visitor));
      expect(visitor.getCost()).toBe(123);
    });
  });

  describe('queries with fragments', () => {
    it('should calculate the correct cost', () => {
      const ast = parse(`
        fragment fragment1 on Item {
          name
          item {
            ...fragment2
          }
        }

        query {
          item {
            ...fragment1
            ... on Item {
              list {
                name
                ...fragment2
              }
            }
          }
          list {
            ...fragment2
          }
        }

        fragment fragment2 on Item {
          name
          ... on Item {
            item {
              name
            }
          }
        }
      `);

      const context = new ValidationContext(schema, ast, typeInfo);
      const visitor = new ComplexityVisitor(context, {});

      visit(ast, visitWithTypeInfo(typeInfo, visitor));
      expect(visitor.getCost()).toBe(53);
    });

    it('should ignore undefined fragments', () => {
      const ast = parse(`
        query {
          item {
            name
            ...fragment1
          }
        }
      `);

      const context = new ValidationContext(schema, ast, typeInfo);
      const visitor = new ComplexityVisitor(context, {});

      visit(ast, visitWithTypeInfo(typeInfo, visitor));
      expect(visitor.getCost()).toBe(1);
    });
  });

  describe('custom visitor costs', () => {
    it('should calculate the correct cost', () => {
      const ast = parse(`
        query {
          item {
            item {
              name
            }
          }
          list {
            name
          }
        }
      `);

      const context = new ValidationContext(schema, ast, typeInfo);
      const visitor = new ComplexityVisitor(context, {
        objectCost: 10,
        listFactor: 3,
      });

      visit(ast, visitWithTypeInfo(typeInfo, visitor));
      expect(visitor.getCost()).toBe(54);
    });
  });

  describe('custom field costs', () => {
    it('should calculate the correct cost', () => {
      const ast = parse(`
        query {
          expensiveItem {
            name
          }
          expensiveList {
            name
          }
        }
      `);

      const context = new ValidationContext(schema, ast, typeInfo);
      const visitor = new ComplexityVisitor(context, {});

      visit(ast, visitWithTypeInfo(typeInfo, visitor));
      expect(visitor.getCost()).toBe(271);
    });
  });

  describe('introspection query', () => {
    it('should calculate a reduced cost for the introspection query', () => {
      const ast = parse(introspectionQuery);

      const context = new ValidationContext(schema, ast, typeInfo);
      const visitor = new ComplexityVisitor(context, {});

      visit(ast, visitWithTypeInfo(typeInfo, visitor));
      expect(visitor.getCost()).toBeLessThan(1000);
    });
  });
});
