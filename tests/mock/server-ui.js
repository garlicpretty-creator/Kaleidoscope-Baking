// Minimal @minecraft/server-ui mock: forms resolve with __ui.nextValues (or canceled).
export const __ui = { nextValues: undefined, shown: [] };
export class ModalFormData {
  constructor() { this.fields = []; }
  title(t) { this._title = t; return this; }
  dropdown(label, items, opts) { this.fields.push({ label, items, opts }); return this; }
  show(player) {
    __ui.shown.push(this);
    const v = __ui.nextValues;
    return Promise.resolve(v ? { canceled: false, formValues: v } : { canceled: true });
  }
}
