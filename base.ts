export * from './map'

// Safe any -----------------------------------------------------------------------
export type something = any

// Global variables for browser and node ------------------------------------------
let uniglobal: something
declare const window: something
declare const global: something
declare const require: something
declare const process: something
let has_windows = false
try {
  uniglobal = window
  has_windows = true
} catch(e) { uniglobal = global }
export { uniglobal }

const console = uniglobal.console

// Useful constants ---------------------------------------------------------------
export const kb = 1024, mb = 1024 * kb
export const sec = 1000, min = 60 * sec, hour = 60 * min, day = 24 * hour
export const million = 1000000, billion = 1000 * million

// environment --------------------------------------------------------------------
export const environment: 'development' | 'production' | 'test' =
  (uniglobal.process && uniglobal.process.env && uniglobal.process.env.environment) ||
  (uniglobal.mono && uniglobal.mono.environment) ||
  'development'
if (!['development', 'production', 'test'].includes(environment)) throw new Error('invalid environment!')

// p ------------------------------------------------------------------------------
function map_to_json_if_defined(v: something) { return v && v.toJSON ? v.toJSON() : v }
let util_inspect = (v: something, options: something): string => {
  try { util_inspect = require('util').inspect } catch(_e) {}

  return util_inspect(v, options)
}
export function pretty_print(v: something, colors = false) {
  v = deep_map(v, map_to_json_if_defined)
  return typeof v == 'object' ? util_inspect(v, { breakLength: 80, colors }) : v
}
export function p(...args: something): void {
  if (has_windows) console.log(...args)
  else {
    const formatted = args.map((v: something) => pretty_print(v, true))
    // It won't printed properly for multiple arguments
    args.length == 1 ? console.log(...formatted) : console.log(...args)
  }
}

const fetch = uniglobal.fetch || require('node-fetch')
// util.inspect

// Test ---------------------------------------------------------------------
export interface TestApi {
  (fn: () => void): void
  (name: string, fn: (() => void)): void
  focus: {
    (fn: () => void): void
    (name: string, fn: (() => void)): void
  }
  run(): void
}
const focused_tests: [string | undefined, () => void][] = []
const tests: [string | undefined, () => void][] = []
export const test = <TestApi>function(...args: something[]) {
  const [name, fn] = args.length == 1 ? [undefined, args[0]] : args
  tests.push([name, fn])
}
test.focus = function(...args: something[]) {
  const [name, fn] = args.length == 1 ? [undefined, args[0]] : args
  focused_tests.push([name, fn])
}
test.run = async () => {
  const list = focused_tests.length > 0 ? focused_tests : tests
  for(const [name, test] of list) {
    try {
      await test()
    } catch(e) {
      log('error', `test failed ${name ? ` '${name}'` : ''}`, e)
      uniglobal.process && uniglobal.process.exit()
    }
  }
  log('info', 'tests passed')
}

export const run_tests = (uniglobal.process && uniglobal.process.env && uniglobal.process.env.test) == 'true'
if (run_tests) uniglobal.setTimeout(test.run, 0)


// documentation -------------------------------------------------------------------------
export interface TextDoc {
  readonly tags?:  string[]
  readonly title:  string
  readonly text:   string
}
export interface TodoDoc {
  readonly priority?: 'low' | 'normal' | 'high'
  readonly tags?:     string[]
  readonly todo:      string
}
export type Doc = TextDoc | TodoDoc
export const all_docs: Doc[] = []
export function doc(...docs: (Doc | (() => Doc))[]) {
  all_docs.push(...(docs.map((d) => typeof d === 'function' ? d() : d)))
}
export function as_code(code: string) { return "\`\`\`\n" + code + "\n\`\`\`" }

// http_call ----------------------------------------------------------------------
export type HttpMethod = 'get' | 'post' | 'put' | 'delete'
export interface HttpCallOptions {
  method?:  HttpMethod
  headers?: { [key: string]: string | undefined }
  params?:  { [key: string]: string | undefined }
  timeout?: number
}
export async function http_call<In, Out>(
  url: string, body: In | {} = {}, options: HttpCallOptions = {}
): Promise<Out> {
  async function call_without_timeout() {
    try {
      // const copied_options1 = { ...{ method: 'post' }, ...options }
      // delete copied_options.timeout
      const fetch = uniglobal.fetch || require('node-fetch')
      if (!fetch) throw new Error('global.fetch not defined')
      const url_with_params = options.params ? build_url(url, options.params) : url
      const method = options.method ?  options.method  : 'post'
      const result = await fetch(
        url_with_params,
        {
          method,
          headers: options.headers ? options.headers : { 'Content-Type': 'application/json' },
          body:    method != 'get' ? JSON.stringify(body) : undefined
        }
      )
      if (!result.ok)
        throw new Error(`can't ${method} ${url} ${result.status} ${result.statusText}`)
      return await result.json()
    } catch (e) {
      throw e
    }
  }
  return new Promise((resolve, reject) => {
    if (options.timeout)
    uniglobal.setTimeout(() => reject(new Error(`request timed out ${url}`)), options.timeout)
    call_without_timeout().then(resolve, reject)
  })
}

// build_url ----------------------------------------------------------------------
export function build_url(
  url: string, query: { [key: string]: string | number | undefined | null } = {}
): string {
  const querystring: string[] = []
  for (const key in query) {
    const value = query[key]
    if (key !== null && key !== undefined && value !== null && value !== undefined)
      querystring.push(`${encodeURIComponent(key)}=${encodeURIComponent('' + query[key])}`)
  }
  if (querystring.length > 0) return `${url}${url.includes('?') ? '&' : '?'}${querystring.join('&')}`
  else                        return url
}

// sleep --------------------------------------------------------------------------
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => uniglobal.setTimeout(resolve, ms))
}


// is_number -----------------------------------------------------------------------------
export function is_number(n: number | undefined | null): n is number {
  // isNumber is broken, it returns true for NaN
  return typeof n == 'number' ? Number.isFinite(n) : false
}

// assert -------------------------------------------------------------------------
export interface Assert {
  (condition: boolean, message?: string | (() => string)): void
  warn(condition: boolean, message?: string | (() => string)): void
  equal(a: unknown, b: unknown, message?: string | (() => string)): void
  approx_equal(a: number, b: number, message?: string | (() => string), delta_relative?: number): void
}
export const assert = <Assert>function(condition, message): void {
  const message_string = message ? (message instanceof Function ? message() : message) : 'Assertion error!'
  if (!condition) throw new Error(message_string)
}
assert.warn = (condition, message) => { if (!condition) log('warn', message || 'Assertion error!') }
assert.equal = (a, b, message) => {
  if (!is_equal(a, b)) {
    const message_string = message ? (message instanceof Function ? message() : message) :
      `Assertion error: ${stable_json_stringify(a, true)} != ${stable_json_stringify(b, true)}`
    throw new Error(message_string)
  }
}
assert.approx_equal = (a, b, message, delta_relative) => {
  delta_relative = delta_relative || 0.001
  const average = (Math.abs(a) + Math.abs(b)) / 2
  const delta_absolute = average * delta_relative
  if (Math.abs(a - b) > delta_absolute) {
    const message_string = message ? (message instanceof Function ? message() : message) :
      `Assertion error: ${stable_json_stringify(a, true)} != ${stable_json_stringify(b, true)}`
    throw new Error(message_string)
  }
}

// deep_clone_and_sort ------------------------------------------------------------
// Clone object with object properties sorted, including for nested objects
export function deep_clone_and_sort(obj: something): something {
  if      (obj === null || typeof obj !== 'object') return obj
  else if (Array.isArray(obj))                      return obj.map(deep_clone_and_sort)
  else if ('toJSON' in obj)                         return deep_clone_and_sort(obj.toJSON())
  else                                              return Object.assign({},
      ...Object.entries(obj)
        .sort(([key_a], [key_b]) => key_a.localeCompare(key_b))
        .map(([k, v]) => ({ [k]: deep_clone_and_sort(v) })
    ))
}

// stable_json_stringify ----------------------------------------------------------
// https://stackoverflow.com/questions/42491226/is-json-stringify-deterministic-in-v8
export function stable_json_stringify(obj: unknown, pretty = true): string {
  return pretty ? JSON.stringify(deep_clone_and_sort(obj), null, 2) : JSON.stringify(deep_clone_and_sort(obj))
}

// is_equal -----------------------------------------------------------------------
export function is_equal(a: unknown, b: unknown): boolean {
  return stable_json_stringify(a) === stable_json_stringify(b)
}

// deep_map -----------------------------------------------------------------------
export function deep_map(obj: something, map: (o: something) => something): something {
  obj = map(obj)
  if      (obj === null || typeof obj !== 'object') return obj
  else if ('map' in obj)                            return obj.map((v: something) => deep_map(v, map))
  else                                              return Object.assign({},
      ...Object.entries(obj)
        .map(([k, v]) => ({ [k]: deep_map(v, map) })
    ))
}
test(() => {
  class Wrapper<T> {
    constructor(readonly v: T) {}
    toJSON() { return this.v }
  }
  const a = new Wrapper([1, 2])
  assert.equal(deep_map(a, map_to_json_if_defined), [1, 2])

  const a_l2 = new Wrapper([a, 3])
  assert.equal(deep_map(a_l2, map_to_json_if_defined), [[1, 2], 3])
})

// md5 ----------------------------------------------------------------------------
let md5: (s: string) => string
try {
  const { createHash } = require('crypto')
  md5 = (data: string) => createHash('md5').update(data).digest('hex')
} catch(e) { md5 = () => { throw new Error("md5 not implemented") } }
export { md5 }

// log ----------------------------------------------------------------------------
export const debug_enabled = (uniglobal.process && uniglobal.process.env && uniglobal.process.env.debug) == 'true'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
// export interface Log {
//   (message: string, short?: something, detailed?: something): void
//   (level: LogLevel, message: string, short?: something, detailed?: something): void
// }

function pad0(v: string | number) { return v.toString().length < 2 ? '0' + v : v }
export function get_formatted_time(time: number, withSeconds = true) {
  let date = new Date(time)
  // year = date.getFullYear()
  return `${pad0(date.getMonth() + 1)}/${pad0(date.getDate())} `
  + `${pad0(date.getHours())}:${pad0(date.getMinutes())}${withSeconds ? ':' + pad0(date.getSeconds()) : ''}`
}

// function pad(v: string, n: number) { return v.substring(0, n).padEnd(n) }

export let inspect: (o: something) => string
try {
  const util = require('util')
  inspect = (o) => util.inspect(o, { depth: null, breakLength: Infinity }).replace(/^'|'$/g, '')
} catch(e) { inspect = (o) => JSON.stringify(o) }

const level_replacements: { [key: string]: string } =
  { debug: 'debug', info: '     ', warn: 'warn ', error: 'error' }

const log_format = has_windows ? ((o: something) => o) : (o: something) => {
  if (o === null || o === undefined || typeof o == 'string' || typeof o == 'number') return o
  return stable_json_stringify(o)
}

// Some errors may contain additional properties with huge data, stripping it
const log_clean_error = (error: Error) => {
  const clean = new Error(error.message)
  clean.stack = error.stack
  return clean
}

function log(message: string, short?: something, detailed?: something): string
function log(
  level: LogLevel, message: string, short?: something, detailed?: something
): string
function log(...args: something[]): string {
  const level = ['info', 'warn', 'error', 'debug'].includes(args[0]) ? args.shift() : 'info'
  if (level == 'debug' && !debug_enabled) return ''
  const [message, short, detailed] = args

  return environment == 'development' ?
    log_in_development(level, message, short, detailed) :
    log_not_in_development(level, message, short, detailed)
}
export { log }

function log_in_development(
  level: LogLevel, message: string, short?: something, detailed?: something
): string {
  let buff: something[] = [level_replacements[level]]
  buff.push(message)

  let error: Error | undefined = undefined
  if (short !== null && short !== undefined) {
    if (short instanceof Error) error = log_clean_error(short)
    else                        buff.push(log_format(short))
  }

  if (detailed !== null && detailed !== undefined) {
    if (detailed instanceof Error) error = log_clean_error(detailed)
    else                           buff.push(log_format(detailed))
  }

  // buff = buff.map((v: something) => deep_map(v, map_to_json_if_defined))

  // Generating id
  let id = ''
  if (level != 'info') {
    id = md5(stable_json_stringify(arguments)).substr(0, 6)
    buff.push(id)
  }

  console[level](...buff)

  // Printing error separately in development
  if (error) {
    const clean_error = ensure_error(error)
    clean_error.stack = clean_stack(error.stack || '')
    console.log('')
    console.error(clean_error)
    console.log('')
  }
  return id
}

function log_not_in_development(
  level: LogLevel, message: string, short?: something, detailed?: something
): string {
  let buff: something[] = [level_replacements[level]]

  buff.push(get_formatted_time(Date.now()))
  buff.push(message)

  if (short !== null && short !== undefined)
    buff.push(log_format(short instanceof Error ? log_clean_error(short) : short))

  if (detailed !== null && detailed !== undefined)
    buff.push(log_format(short instanceof Error ? log_clean_error(detailed) : detailed))

  // Generating id
  let id = ''
  if (level != 'info') {
    id = md5(stable_json_stringify(arguments)).substr(0, 6)
    buff.push(id)
  }

  // Printing
  console[level](...buff)
  return id
}


// export function logWithUser(
//   level: LogLevel, user: string, message: string, short?: something, detailed?: something
// ): string { return log(level, `${pad(user, 8)} ${message}`, short, detailed) }

// Timer
export function timer(): () => number {
  const start = Date.now()
  return function(){ return Date.now() - start }
}

// clean_stack --------------------------------------------------------------------
export let clean_stack: (stack: string) => string
{
  const stack_skip_re = new RegExp([
    '/node_modules/',
    'internal/(modules|bootstrap|process)',
    'at new Promise \\(<anonymous>\\)',
    'at Object.next \\(',
    'at step \\(',
    'at __awaiter \\(',
    'at Object.exports.assert \\('
  ].join('|'))
  clean_stack = (stack) => {
    const lines = stack
      .split("\n")
      .filter((line) => {
        return !stack_skip_re.test(line)
      })
      .map((line, i) =>
        i == 0 ? line : line.replace(/([^\/]*).*(\/[^\/]+\/[^\/]+\/[^\/]+)/, (_match, s1, s2) => s1 + '...' + s2)
      )
    return lines.join("\n")
  }
}

uniglobal.process && uniglobal.process.on('uncaughtException', function(error: something) {
  error.stack = clean_stack(error.stack)
  console.log('')
  console.error(error)
  process.exit()
})

// Promise ------------------------------------------------------------------------
export function once<F extends Function>(f: F): F {
  let called = false, result: something = undefined
  return function (this: something) {
    if (called) return result
    result = f.apply(this, arguments)
    called = true
  } as something
}

// Promise ------------------------------------------------------------------------
// For better logging, by default promise would be logged as `{}`
;(Promise.prototype as something).toJSON = function() { return 'Promise' }
Object.defineProperty(Promise.prototype, "cmap", { configurable: false, enumerable: false })





















// --------------------------------------------------------------------------------
// Extensions ---------------------------------------------------------------------
// --------------------------------------------------------------------------------


type Predicate<V, K> = (value: V, key: K) => boolean

// type OMap<T> = { [key: string]: T }


// length -------------------------------------------------------------------------
export function length<T>(o: Array<T> | { [key: string]: T } | String | string): number {
  if (o instanceof Array)                               return o.length
  else if (o instanceof String || typeof o == 'string') return o.length
  else {
    let i = 0
    for (const k in o) if (o.hasOwnProperty(k)) i++
    return i
  }
}


// is_empty -----------------------------------------------------------------------
export function is_empty<T>(o: Array<T> | { [key: string]: T } | String | string): boolean {
  return length(o) == 0
}


// take ---------------------------------------------------------------------------
function take<T>(s: string, n: number): string
function take<T>(list: Array<T>, n: number): Array<T>
function take<T>(list: string | Array<T>, n: number) {
  return list.slice(0, n)
}
export { take }


// last ---------------------------------------------------------------------------
export function last<T>(list: Array<T>): T
export function last<T>(list: Array<T>, n: number): T[]
export function last<T>(list: string): T[]
export function last<T>(list: string, n: number): T[]
export function last<T>(list: Array<T> | string, n?: number) {
  if (n === undefined) {
    if (list.length < 1) throw new Error(`can't get last elements from empty list`)
    return list[list.length - 1]
  } else {
    if (list.length < n) throw new Error(`can't get last ${n} elements from list of length ${list.length}`)
    else return list.slice(list.length - n, list.length)
  }
}


// last ---------------------------------------------------------------------------
export function first<T>(list: Array<T>): T
export function first<T>(list: Array<T>, n: number): T[]
export function first<T>(list: Array<T>, n?: number) {
  if (n === undefined) {
    if (list.length < 1) throw new Error(`can't get first elements from empty list`)
    return list[0]
  } else {
    if (list.length < n) throw new Error(`can't get first ${n} elements from list of length ${list.length}`)
    else return list.slice(0, n)
  }
}


// reverse -------------------------------------------------------------------------------
export function reverse<T>(list: T[]): T[] {
  list = [...list]
  list.reverse()
  return list
}


// each ----------------------------------------------------------------------------------
function each<T>(list: T[], f: (v: T, i: number) => void): void
function each<K, V>(map: Map<K, V>, f: (v: V, k: K) => void): void
function each<M extends {}, K extends keyof M>(map: M, f: (v: M[K], k: K) => void): void
function each<T>(o: T[] | { [key: string]: T }, f: (v: T, i: something) => void): void {
  if      (o instanceof Array) for(let i = 0; i < o.length; i++) f(o[i], i)
  else if (o instanceof Map)   for(const [k, v] of o) f(v, k)
  else                         for(const k in o) if (o.hasOwnProperty(k)) f(o[k], k)
}
export { each }


// Found ---------------------------------------------------------------------------------
export type Found<V> = { found: true, value: V } | { found: false, message: string }


// find ----------------------------------------------------------------------------------
function find<T>(list: T[], v: T): T | undefined
function find<T>(list: T[], f: (v: T, i: number) => boolean): T | undefined
function find<T>(map: { [key: string]: T }, f: (v: T, k: string) => boolean): T | undefined
function find<T>(o: T[] | { [key: string]: T }, finder: T | ((v: T, i: something) => boolean)): T | undefined {
  const predicate = finder instanceof Function ? finder : (v: T) => v == finder
  if (o instanceof Array) for(let i = 0; i < o.length; i++) if (predicate(o[i], i)) return o[i]
  else                    for(const k in o) if (o.hasOwnProperty(k)) if (predicate(o[k], k)) return o[k]
  return undefined
}
export { find }


// ensure_find ---------------------------------------------------------------------------
function ensure_find<T>(list: T[], v: T, on_error?: string | (() => string)): T
function ensure_find<T>(list: T[], f: (v: T, i: number) => boolean, on_error?: string | (() => string)): T
function ensure_find<T>(
  map: { [key: string]: T }, f: (v: T, k: string) => boolean, on_error?: string | (() => string)
): T
function ensure_find<T>(
  o: something, finder: T | ((v: T, i: something) => boolean), on_error?: string | (() => string)
): T {
  const found = find(o, finder) as T
  if (found === undefined)
    throw new Error(on_error ? (typeof on_error == 'function' ? on_error() : on_error) : `element not found!`)
  return found
}
export { ensure_find }


// find_index ----------------------------------------------------------------------------
function find_index<T>(list: T[], v: T): number | undefined
function find_index<T>(list: T[], f: (v: T, i: number) => boolean): number | undefined
function find_index<T>(list: T[], finder: T | ((v: T, i: something) => boolean)): number | undefined {
  const predicate = finder instanceof Function ? finder : (v: T) => v == finder
  for(let i = 0; i < list.length; i++) if (predicate(list[i], i)) return i
  return undefined
}
export { find_index }


// find_last_index -----------------------------------------------------------------------
function find_last_index<T>(list: T[], v: T): number | undefined
function find_last_index<T>(list: T[], f: (v: T, i: number) => boolean): number | undefined
function find_last_index<T>(list: T[], finder: T | ((v: T, i: something) => boolean)): number | undefined {
  const predicate = finder instanceof Function ? finder : (v: T) => v == finder
  for(let i = list.length - 1; i >= 0; i--) if (predicate(list[i], i)) return i
  return undefined
}

export { find_last_index }


// group_by ------------------------------------------------------------------------------
function group_by<V>(list: V[], f: (v: V, i: number) => number): Map<number, V[]>
function group_by<V>(list: V[], f: (v: V, i: number) => string): Map<string, V[]>
function group_by<V>(list: V[], f: (v: V, i: something) => something): Map<something, V[]> {
  return reduce(list, new Map<string | number, V[]>(), (acc, v, i) => {
    const key = f(v, i)
    let group = acc.get(key)
    if (!group) {
      group = []
      acc.set(key, group)
    }
    group.push(v)
    return acc
  })
}
export { group_by }


// group_by_n --------------------------------------------------------------------------------------
export function group_by_n<V>(list: V[], n: number): V[][] {
  const result: V[][] = []
  let i = 0
  while (true) {
    const group: V[] = []
    if (i < list.length) result.push(group)

    for (let j = 0; j < n; j++) {
      if ((i + j) < list.length) group.push(list[i + j])
      else return result
    }

    i+= n
  }
}
test("group_by_n", () => {
  assert.equal(group_by_n([1, 2, 3], 2), [[1, 2], [3]])
  assert.equal(group_by_n([1, 2], 2), [[1, 2]])
  assert.equal(group_by_n([1], 2), [[1]])
  assert.equal(group_by_n([], 2), [])
})


// execute_async -----------------------------------------------------------------------------------
export async function execute_async<T, R>(
  tasks: T[], process: ((task: T) => Promise<R>), workers_count: number
): Promise<R[]> {
  const results: { [key: number]: R } = {}
  let i = 0
  async function worker() {
    while (i < tasks.length) {
      const task_i = i++
      const task = tasks[task_i]
      results[task_i] = await process(task)
    }
  }
  const promises: Promise<void>[] = []
  for (let i = 0; i < workers_count; i++) promises.push(worker())
  for (const promise of promises) await promise
  return map(tasks, (_v, i) => results[i])
}


// entries ------------------------------------------------------------------------------
function entries<K, V>(map: Map<K, V>): [K, V][]
function entries<V>(map: { [key: string]: V }): [string, V][]
function entries<K, V>(map: Map<K, V> | { [key: string]: V }): [K | string, V][] {
  return map instanceof Map ? Array.from(map) : Object.entries(map)
}
export { entries }


// has ----------------------------------------------------------------------------
function has<T>(list: T[], v: T): boolean
function has<T>(list: T[], f: (v: T, i: number) => boolean): boolean
function has<T>(map: { [key: string]: T }, f: (v: T, k: string) => boolean): boolean
function has(o: something, finder: something): boolean { return !!find(o, finder) }
export { has }


// partition ----------------------------------------------------------------------
function partition<T>(list: Array<T>, f: Predicate<T, number>): [Array<T>, Array<T>]
function partition<T>(list: Array<T>, keys: number[]): [Array<T>, Array<T>]
function partition<M extends {}, K extends keyof M>(map: M, f: Predicate<M[keyof M], keyof M>): [M, M]
function partition<M extends {}, K extends keyof M>(map: M, keys: (keyof M)[]): [Pick<M, K>, Exclude<M, K>]
function partition(o: something, splitter: something) {
  if (o instanceof Array) {
    const selected = new Array(), rejected = new Array()
    const f = splitter instanceof Function ? splitter : (_v: something, i: something) => splitter.includes(i)
    each(o, (v, i) => f(v, i) ? selected.push(v) : rejected.push(v))
    return [selected, rejected]
  } else {
    const selected = {} as something, rejected = {} as something
    const f = splitter instanceof Function ? splitter : (_v: something, k: something) => splitter.includes(k)
    each(o, (v, k) => f(v, k) ? selected[k] = v : rejected[k] = v)
    return [selected, rejected]
  }
}
export { partition }


// sort ---------------------------------------------------------------------------
function sort(list: string[], comparator?: (a: string, b: string) => number): string[]
function sort(list: number[], comparator?: (a: number, b: number) => number): number[]
function sort<V>(list: V[], comparator?: (a: V, b: V) => number): V[] {
  if (list.length == 0) return list
  else {
    if (comparator) {
      list = [...list]
      list.sort(comparator)
      return list
    } else {
      if      (typeof list[0] == 'number')
        comparator = function(a: number, b: number) { return a - b } as something
      else if (typeof list[0] == 'string')
        comparator = function(a: string, b: string) { return a.localeCompare(b) } as something
      else
        throw new Error(`the 'comparator' required to sort a list of non numbers or strings`)

      list = [...list]
      list.sort(comparator)
      return list
    }
  }
}
export { sort }


// sort_by -------------------------------------------------------------------------------
function sort_by<V>(list: V[], by: (v: V) => string): V[]
function sort_by<V>(list: V[], by: (v: V) => number): V[]
function sort_by<V>(list: V[], by: (v: V) => string | number): V[] {
  if (list.length == 0) return list
  else {
    let comparator: (a: V, b: V) => number
    if      (typeof by(list[0]) == 'number')
      comparator = function(a, b) { return (by(a) as number) - (by(b) as number) }
    else if (typeof by(list[0]) == 'string')
      comparator = function(a, b) { return (by(a) as string).localeCompare(by(b) as string) }
    else
      throw new Error(`invalid return type for 'by'`)

    list = [...list]
    list.sort(comparator)
    return list
  }
}
export { sort_by }


// filter_map -------------------------------------------------------------------------
function filter_map<V, S>(list: V[], f: (v: V, i: number) => S | false): S[]
function filter_map<V, S>(map: Map<number, V>, f: (v: V, k: number) => S | false): Map<number, S>
function filter_map<V, S>(map: Map<string, V>, f: (v: V, k: string) => S | false): Map<string, S>
function filter_map<V, S>(map: { [key: string]: V }, f: (v: V, k: string) => S | false): { [key: string]: S }
function filter_map(o: something, f: something): something {
  if (o instanceof Array) {
    const filtered: something[] = []
    each(o, (v, k) => {
      const r = f(v, k)
      if (r !== false) filtered.push(r)
    })
    return filtered
  } else if (o instanceof Map) {
    const filtered = new Map<something, something>()
    each(o, (v, k) => {
      const r = f(v, k)
      if (r !== false) filtered.set(k, r)
    })
    return filtered
  } else {
    const filtered: something = {}
    each(o, (v, k) => {
      const r = f(v, k)
      if (r !== false) filtered[k] = r
    })
    return filtered
  }
}
export { filter_map }


// fill ---------------------------------------------------------------------------------
export function fill<V>(size: number, v: V | ((i: number) => V)): V[] {
  const f: ((i: number) => V) = typeof v == 'function' ? v as ((i: number) => V) : () => v
  const list: V[] = []
  for (let i = 0; i < size; i++) list.push(f(i))
  return list
}


// fill ---------------------------------------------------------------------------------
export function skip_undefined<V>(list: (V | undefined)[]): V[] {
  return filter_map(list, (v) => v !== undefined ? v : false)
}


// reject -------------------------------------------------------------------------
function reject<T>(list: Array<T>, f: Predicate<T, number>): Array<T>
function reject<T>(list: Array<T>, keys: number[]): Array<T>
function reject<T>(map: { [key: string]: T }, f: Predicate<T, string>): { [key: string]: T }
function reject<T>(map: { [key: string]: T }, keys: string[]): { [key: string]: T }
function reject(o: something, f: something) { return partition(o, f)[1] }
export { reject }

// uniq ---------------------------------------------------------------------------
export function unique<V, Key>(list: Array<V>, to_key?: (v: V) => Key): Array<V> {
  const set = new Set<something>()
  const _to_key = to_key || ((v: V) => v)
  return list.filter((v) => {
    const key = _to_key(v)
    if (set.has(key)) return false
    else {
      set.add(key)
      return true
    }
  })
}


// pick ---------------------------------------------------------------------------
function pick<T>(list: T[], keys: number[]): T[]
function pick<T extends {}, K extends keyof T>(map: T, k: K[]): Pick<T, K>
function pick(o: something, keys: (string | number)[]) {
  return partition(o, (_v, i: something) => keys.includes(i))[0]
}
export { pick }
test(() => {
  assert.equal(pick({ a: 1, b: 2 }, ['a']), { a: 1 })
})


// ensure --------------------------------------------------------------------------------
export function ensure<V>(value: (V | undefined) | Found<V>, info?: string): V {
  if ((typeof value == 'object') && ('found' in value)) {
    if (!value.found) throw new Error(value.message || `value${info ? ' ' + info : ''} not found`)
    else              return value.value
  } else {
    if (value === undefined) throw new Error(`value${info ? ' ' + info : ''} not defined`)
    else              return value
  }
}


// remove -------------------------------------------------------------------------
// function remove<V>(list: Array<V>, i: number): V | undefined
// function remove<V>(list: Array<V>, f: Predicate<V, number>): Array<V>
// function remove<V, K>(map: Map<K, V>, k: K): V | undefined
// function remove<V, K>(map: Map<K, V>, f: Predicate<V, K>): Map<K, V>
// function remove<V, K>(o: Array<V> | Map<K, V>, f: something) {
//   if (o instanceof Array) {
//     if (f instanceof Function) {
//       const [deleted, remained] = partition(o, f)
//       o.splice(0, remained.length, ...remained)
//       return deleted
//     } else {
//       if (f >= o.length) return undefined
//       const v = o[f]
//       o.splice(f, 1)
//       return v
//     }
//   } else {
//     if (f instanceof Function) {
//       const [deleted] = partition(o, f)
//       each(deleted, (_v, k) => delete o[k])
//       return deleted
//     } else {
//       if (!o.hasOwnProperty(f)) return undefined
//       const v = o[f]
//       delete o[f]
//       return v
//     }
//   }
// }
// export { remove }


// reduce -------------------------------------------------------------------------
function reduce<A, V>(list: V[], accumulator: A, f: (accumulator: A, v: V, key: number) => A): A
function reduce<A, V, K>(map: Map<K, V>, accumulator: A, f: (accumulator: A, v: V, key: number) => A): A
function reduce<A, V>(map: { [key: string]: V }, accumulator: A, f: (accumulator: A, v: V, key: string) => A): A
function reduce<A, V>(
  o: something, accumulator: A, f: (accumulator: A, v: V, key: something) => A
) {
  each(o as something, (v: something, i) => accumulator = f(accumulator, v, i))
  return accumulator
}
export { reduce }


// keys ---------------------------------------------------------------------------
function keys<V>(list: Array<V>): number[]
function keys<V, K>(map: Map<K, V>): K[]
// Adding `& string` because otherwise it would infer the type as `(string | number)[]`
// see https://stackoverflow.com/questions/51808160/keyof-inferring-string-number-when-key-is-only-a-string
function keys<T, O extends { [key: string]: T }>(map: O): (keyof O & string)[]
function keys<T>(o: something) {
  return reduce(o, [], (list: something, _v, k: something) => { list.push(k); return list })
}
export { keys }


// values --------------------------------------------------------------------------------
function values<T>(list: T[]): T[]
function values<T>(map: { [key: string]: T | undefined }): T[]
function values<K, T>(map: Map<K, T>): T[]
function values(o: something) {
  return reduce(o, [], (list: something, v) => { list.push(v); return list })
}
export { values }


// flatten -------------------------------------------------------------------------------
export function flatten<T>(list: T[][]): T[] {
  return reduce(list, [] as T[], (acc, v) => { acc.push(...v); return acc })
}


// sum -----------------------------------------------------------------------------------
export function sum(list: number[]): number {
  return reduce(list, 0, (sum, v) => sum + v)
}

// map ----------------------------------------------------------------------------
// function map<T, R>(list: T[], f: (v: T, i: number) => R): R[]
// function map<M extends {}, K extends keyof M, R>(map: M, f: (v: M[K], k: K) => R): { [key in K]: R }
// function map<T, R>(o: T[] | { [key: string]: T }, f: (v: T, k: something) => R) {
//   if (o instanceof Array) return o.map(f)
//   else {
//     const mapped = {} as something
//     each(o, (v, k) => mapped[k] = f(v, k))
//     return mapped
//   }
// }
// export { map }
function map<V, R>(list: V[], f: (v: V, i: number) => R): R[]
function map<K, V, R>(map: Map<K, V>, f: (v: V, k: K) => R): Map<K, R>
function map<M extends {}, K extends keyof M, R>(map: M, f: (v: M[K], k: K) => R): { [key in K]: R }
function map<K, V, R>(o: something, f: (v: V, k: something) => R) {
  if        (o instanceof Array) {
    return o.map(f)
  } else if (o instanceof Map) {
    const mapped = new Map<K, R>()
    each(o, (v, k) => mapped.set(k, f(v, k)))
    return mapped
  } else {
    const mapped = {} as something
    each(o, (v: something, k) => mapped[k] = f(v, k))
    return mapped
  }
}
export { map }


// round --------------------------------------------------------------------------
export function round(v: number, digits: number = 0): number {
  return digits == 0 ?
    Math.round(v) :
    Math.round((v + Number.EPSILON) * Math.pow(10, digits)) / Math.pow(10, digits)
}
test(() => {
  assert.equal(round(0.05860103881518906, 2), 0.06)
})


// shuffle ------------------------------------------------------------------------
export function shuffle<T>(list: T[], seed?: number | string): T[] {
  const random = seed !== undefined ? seedrandom(seed) : () => Math.random()
  list = [...list]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]]
  }
  return list
}


// debounce -----------------------------------------------------------------------
export function debounce<F extends ((...args: something[]) => void)>(fn: F, timeout: number): F {
  let timer: something = undefined
  return ((...args: something[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), timeout)
  }) as F
}

// seedrandom ---------------------------------------------------------------------
let seedrandom: (seed: number | string) => (() => number)
{
  let seedrandom_lib: something = undefined
  seedrandom = (seed) => {
    // Code for proper random generator is not simple, the library needed
    if (seedrandom_lib === undefined) seedrandom_lib = require('seedrandom')
    return seedrandom_lib('' + seed)
  }
}
export { seedrandom }


// CustomError --------------------------------------------------------------------
export class CustomError extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, CustomError.prototype)
  }
}


// NeverError ---------------------------------------------------------------------
export class NeverError extends Error {
  constructor(message: never) { super(`NeverError: ${message}`) }
}


// ensure_error -------------------------------------------------------------------
export function ensure_error(error: something, default_message = "Unknown error"): Error {
  if (error && (typeof error == 'object') && (error instanceof Error)) {
    if (!error.message) error.message = default_message
    return error
  } else {
    return new Error('' + (error || default_message))
  }
  // return '' + ((error && (typeof error == 'object') && error.message) || default_message)
}


// Error.toJSON -------------------------------------------------------------------
// Otherwise JSON will be empty `{}`
;(Error.prototype as something).toJSON = function(this: something) {
  return { message: this.message, stack: this.stack }
}

// Map.toJSON ---------------------------------------------------------------------
// Otherwise JSON will be empty `{}`
;(Map.prototype  as something).toJSON = function(this: something) {
  return reduce(this, {}, (map: something, v, k) => { map[k] = v; return map })
}


// Test ---------------------------------------------------------------------------
// export async function test(title: string, fn: () => Promise<void> | void): Promise<void> {
//   try       { await fn() }
//   catch (e) {
//     log('error', title)
//     throw e
//   }
// }

// Errorneous ----------------------------------------------------------------------------
export type Errorneous<R> = { is_error: true, error: string } | { is_error: false, value: R }