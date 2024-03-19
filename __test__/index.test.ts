// @ts-nocheck

import { Component, Host, Reactive, ComponentRegistry, State, Blueprint } from '../src';

class TestComp extends Component {
  stringify(desc: string): string {
    let text = `<${this.constructor.name}> ${desc}`;
    const meta = this.meta;

    for (const [key] of meta.properties) {
      text += ` ${key}=${(this as any)[key] + ''},`;
    }

    return text;
  }
}

it('meta data', () => {
  class A extends Component {
    @Reactive()
    name = 'A';

    @Reactive()
    color = 'red';
  }

  class B extends A {
    @Reactive()
    name2 = 'B';

    @Reactive()
    color2 = 'blue';
  }

  const a = new A(ComponentRegistry.Default);
  const b = new B(ComponentRegistry.Default);

  const aMeta = a.meta;
  const bMeta = b.meta;

  expect(aMeta).toEqual({
    properties: new Map([
      ['name', {}],
      ['color', {}],
    ]),
  });

  expect(bMeta).toEqual({
    properties: new Map([
      ['name', {}],
      ['color', {}],
      ['name2', {}],
      ['color2', {}],
    ]),
  });
});

it('life cycle', () => {
  const registry = new ComponentRegistry();
  const timelines: string[] = [];

  class B extends TestComp {
    @Reactive()
    text = 'x';

    onInit(): void {
      timelines.push('  ' + this.stringify('onInit'));
    }

    onBeforeUpdate(): void {
      timelines.push('  ' + this.stringify('onBeforeUpdate'));
    }

    onAfterUpdate(): void {
      timelines.push('  ' + this.stringify('onAfterUpdate'));
    }

    onUpdate(): Blueprint[] {
      timelines.push('  ' + this.stringify('onUpdate'));
      return [];
    }

    onDestroy(): void {
      timelines.push('  ' + this.stringify('onDestroy'));
    }
  }

  class A extends TestComp {
    @Reactive()
    name = 'Jam';

    @Reactive()
    color = 'red';

    onInit(): void {
      timelines.push(this.stringify('onInit'));
    }

    onUpdate(): Blueprint[] {
      timelines.push(this.stringify('onUpdate'));
      return [Blueprint.of('B', { text: [this.name, this.color].join('-') })];
    }

    onBeforeUpdate(): void {
      timelines.push(this.stringify('onBeforeUpdate'));
    }

    onAfterUpdate(): void {
      timelines.push(this.stringify('onAfterUpdate'));
    }

    onDestroy(): void {
      timelines.push(this.stringify('onDestroy'));
    }
  }

  registry.register('A', A);
  registry.register('B', B);

  const host = new Host('A', registry);
  host.flush({});
  expect(timelines).toMatchSnapshot('with initial values');

  host.flush({ name: 'Tom' });
  host.flush({ name: 'Jane' });
  host.destroy();

  expect(timelines).toMatchSnapshot();
});

it('equals check', () => {
  const registry = new ComponentRegistry();
  const timelines: string[] = [];

  class A extends TestComp {
    @Reactive()
    name = 'TOM';

    onBeforeUpdate(): void {
      timelines.push(this.stringify('receive:'));
    }
  }

  registry.register('A', A);
  const host = new Host('A', registry);

  host.flush({ name: 'TOM' });
  host.flush({ name: 'JANE' });
  host.flush({ name: 'JANE' });

  expect(timelines).toMatchSnapshot();
});

it('Cannot call requestUpdate in onUpdate', () => {
  const registry = new ComponentRegistry();

  class A extends TestComp {
    @Reactive()
    name = '';

    onUpdate(): Blueprint[] {
      this.set({ name: 'JANE' });
    }
  }

  registry.register('A', A);
  const host = new Host('A', registry);

  expect(() => host.flush({ name: 'TOM' })).toThrow('Cannot call requestUpdate in onUpdate');
});

it.only('set props on lifecycle', () => {
  const registry = new ComponentRegistry();
  const timelines: string[] = [];

  class A extends TestComp {
    @Reactive()
    name = '';

    @Reactive()
    color = '';

    onInit(): void {
      this.set({ name: 'JANE' });
      this.set({ name: 'JANE2' });
      this.set({ color: 'RED' });
    }

    onUpdate(): void {
      timelines.push(this.stringify('receive:'));
    }
  }

  registry.register('A', A);
  const host = new Host('A', registry);

  host.flush({});
  expect(timelines).toEqual(['<A> receive: name=JANE2, color=RED,']);
});
