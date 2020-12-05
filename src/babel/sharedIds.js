export class SharedIds {
  constructor(t) {
    this.t = t;
    this.execId = t.identifier('_exec');
    this.patternId = t.identifier('_pattern');
    this.tagId = t.identifier('tag');
  }

  get exec() {
    return this.t.identifier(this.execId.name);
  }

  get pattern() {
    return this.t.identifier(this.patternId.name);
  }

  get tag() {
    return this.t.identifier(this.tagId.name);
  }
}
