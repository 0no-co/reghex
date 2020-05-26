export class SharedIds {
  constructor(t) {
    this.t = t;
    this.execId = t.identifier('_exec');
    this.substrId = t.identifier('_substr');
    this.patternId = t.identifier('_pattern');
    this.tagId = t.identifier('tag');
  }

  get node() {
    return this.t.identifier('node');
  }

  get match() {
    return this.t.identifier('match');
  }

  get state() {
    return this.t.identifier('state');
  }

  get exec() {
    return this.t.identifier(this.execId.name);
  }

  get substr() {
    return this.t.identifier(this.substrId.name);
  }

  get pattern() {
    return this.t.identifier(this.patternId.name);
  }

  get tag() {
    return this.t.identifier(this.tagId.name);
  }
}
