export class SharedIds {
  constructor(t) {
    this.t = t;
    this.getLastIndexId = t.identifier('_getLastIndex');
    this.setLastIndexId = t.identifier('_setLastIndex');
    this.execPatternId = t.identifier('_execPattern');
    this.patternId = t.identifier('_pattern');
    this.tagId = t.identifier('tag');
  }

  get node() {
    return this.t.identifier('node');
  }

  get match() {
    return this.t.identifier('match');
  }

  get getLastIndex() {
    return this.t.identifier(this.getLastIndexId.name);
  }

  get setLastIndex() {
    return this.t.identifier(this.setLastIndexId.name);
  }

  get execPattern() {
    return this.t.identifier(this.execPatternId.name);
  }

  get pattern() {
    return this.t.identifier(this.patternId.name);
  }

  get tag() {
    return this.t.identifier(this.tagId.name);
  }
}
