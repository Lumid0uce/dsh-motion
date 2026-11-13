/**
 * Host half of the motion bundle.
 *
 * The whole feature is a stylesheet, so there is nothing to do here: the Client
 * module registers one hidden `<style>` carrier into `shell.overlay` and the
 * browser applies the transitions. Keeping the Host half empty means the bundle
 * has no Host config, no services and nothing to dispose.
 */
export function apply() {}
