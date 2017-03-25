// # Process

const isCommand = o => typeof o === "string" && o[0] === "@";
const isProgram = Array.isArray;
let procId = 1;

// Processes are the principal computation unit. It departures from typical
// processes in that it model the concept of time
export class Process {
  constructor(program, context, time, rate) {
    this.id = "proc-" + procId++;
    // a stack of values
    this.stack = [];
    // the instructions are stored in a stack (in reverse order)
    this.instructions = program ? [program] : [];
    // the context is used to store variables with scope
    this.context = context ? context : new Context();
    // the current time
    this.time = typeof time === "number" ? time : 0;
    // how fast time passes
    this.rate = typeof rate === "number" ? rate : 1;
  }

  // wait an amount of time
  wait (time) {
    this.time += this.rate * time
  }

  // To run an instruction, the process uses a _commands_ object (a map from
  // a instruction to a function) and an actions object (that will be exposed
  // to that function an uses as communication mechanism with the outside world)
  // The `step` function runs the next instruction of the process
  step(commands, actions) {
    const { instructions } = this;
    if (instructions.length) {
      const instr = instructions.pop();
      if (instr === null || instr === undefined) {
        // ignore
      } else if (isProgram(instr)) {
        // if it's program, and since the instructions are stored into an stack,
        // we need add to the program instructions in reverse order
        for (let i = instr.length - 1; i >= 0; i--) {
          instructions.push(instr[i]);
        }
      } else if (isCommand(instr)) {
        const operation = commands[instr];
        if (typeof operation === "function") operation(this, actions);
        else actions.error("Instruction '" + instr + "' not recognized.");
      } else {
        // if it's a value, push it into the stack
        this.stack.push(instr);
      }
    }
  }

  // the `resume` function run all the instructions until time is reached
  resume(commands, actions, time = Infinity, limit = 10000) {
    const { instructions } = this;
    while (--limit > 0 && this.time < time && instructions.length) {
      this.step(commands, actions);
    }
    if (limit === 0)
      actions.error("Run limit reached. Probably an infinite loop.");
    return instructions.length > 0;
  }
}

// ## Context

// A context is a hierarchical structure to store values with scope
export class Context {
  constructor(parent, local) {
    this.parent = parent;
    this.local = local ? Object.assign({}, local) : undefined;
  }
  // get a value from a context
  get(id) {
    let target = this;
    while (target.value(id) === undefined && target.parent) {
      target = target.parent;
    }
    return target.value(id);
  }

  // set a value from a context
  set(id, value) {
    let target = this;
    while (target.value(id) === undefined && target.parent) {
      target = target.parent;
    }
    target.let(id, value);
  }
  // get a value from the local scope of a context
  value(id) {
    return this.local ? this.local[id] : undefined;
  }

  // set a value into the local scope of a context
  let(id, value) {
    if (!this.local) this.local = {};
    this.local[id] = value;
  }
}
