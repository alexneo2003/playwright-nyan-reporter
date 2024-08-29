/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

import { FullConfig } from '@playwright/test';
import { FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

import { color, cursor, epilogue, printFailureMessages, supportsColor, window } from './helpers';

const write = (string: string) => process.stdout.write(string);

export type TotalResults = {
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTotalTests: number;
  startTime: number;
  status: string;
  testResults: Array<{
    test: TestCase;
    result: TestResult;
  }>;
};

export type NyanReporterOptions = {
  suppressErrorReporter?: boolean;
  renderOnRunCompletely?: boolean;
};

class NyanReporter implements Reporter {
  /**
   * Constructor for the NyanReporter.
   * Options aren't directly passed to the NyanReporter
   * but are instead passed through Jest. We specify the options in the
   * jest configuration and as a result they are passed to us
   *
   * Following options are supported with Jest right now:
   *
   * - suppressErrorReporter
   *   If this is `true` the Error reporter isn't showed in case tests fail.
   *
   * - renderOnRunCompletely
   *   If true, the output is only rendered when the run completes successfully
   *
   * @constructor
   */

  width: number;
  nyanCatWidth: number;
  colorIndex: number;
  numberOfLines = 4;
  rainbowColors: number[];
  scoreboardWidth = 5;
  tick: boolean;
  trajectories = [[], [], [], []];
  trajectoryWidthMax: number;
  totalResults: TotalResults = {} as TotalResults;

  suppressErrorReporter = true;
  renderOnRunCompletely = false;

  constructor(options: NyanReporterOptions) {
    const nyanCatWidth = (this.nyanCatWidth = 11);
    this.width = window.width * 0.75 || 0;
    this.colorIndex = 0;
    this.numberOfLines = 4;
    this.rainbowColors = this.generateColors();
    this.scoreboardWidth = 5;
    this.tick = false;
    this.trajectories = [[], [], [], []];
    this.trajectoryWidthMax = this.width - nyanCatWidth;
    this.suppressErrorReporter = options.suppressErrorReporter || true;
    this.renderOnRunCompletely = options.renderOnRunCompletely || false;
    this.totalResults = {
      numPassedTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
      numTotalTests: 0,
      startTime: Date.now(),
      status: '',
      testResults: [],
    };
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    cursor.CR();
    cursor.hide();

    if (!this.renderOnRunCompletely) {
      this.draw();
    }
    this.totalResults.startTime = Date.now();
    this.totalResults.numTotalTests = suite.allTests().length;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.updateTotalResults(result);
    this.totalResults.testResults.push({ test, result });

    if (!this.renderOnRunCompletely) {
      this.draw();
    }
  }

  onEnd(result: FullResult): void {
    this.draw();
    cursor.show();
    for (let i = 0; i < this.numberOfLines; i++) {
      write('\n');
    }

    epilogue(this.totalResults);

    this.totalResults.status = result.status;
    if (!this.suppressErrorReporter) {
      printFailureMessages(this.totalResults);
    }
  }

  printsToStdio(): boolean {
    return true;
  }

  updateTotalResults(result: TestResult): void {
    switch (result.status) {
      case 'passed':
        this.totalResults.numPassedTests++;
        break;
      case 'failed':
        this.totalResults.numFailedTests++;
        break;
      case 'timedOut':
        this.totalResults.numPendingTests++;
        break;
      case 'skipped':
        this.totalResults.numPendingTests++;
        break;
      default:
        break;
    }
  }

  /**
   * Generate rainbow colors
   *
   * @private
   * @return {Array}
   */
  generateColors(): Array<number> {
    const colors: Array<number> = [];
    for (let i = 0; i < 6 * 7; i++) {
      const pi3 = Math.floor(Math.PI / 3);
      const n = i * (1.0 / 6);
      const r = Math.floor(3 * Math.sin(n) + 3);
      const g = Math.floor(3 * Math.sin(n + 2 * pi3) + 3);
      const b = Math.floor(3 * Math.sin(n + 4 * pi3) + 3);
      colors.push(36 * r + 6 * g + b + 16);
    }
    return colors;
  }

  drawScoreboard(): void {
    const { numPassedTests, numFailedTests, numPendingTests, numTotalTests } = this.totalResults;
    this.drawType('total tests', numTotalTests);
    this.drawType('green', numPassedTests);
    this.drawType('fail', numFailedTests);
    this.drawType('pending', numPendingTests);

    this.cursorUp(this.numberOfLines);
  }

  /**
   * Draws the type of stat along with a color
   */
  drawType(type: string, n: number): void {
    write(' ');
    write(color(type, n));
    write('\n');
  }

  /**
   * Append the rainbow.
   * @private
   *
   * @param {string} str
   * @return {string}
   */
  appendRainbow(): void {
    const segment = this.tick ? '_' : '-';
    const rainbowified = this.rainbowify(segment);

    for (let index = 0; index < this.numberOfLines; index++) {
      const trajectory: Array<string> = this.trajectories[index];
      if (trajectory.length >= this.trajectoryWidthMax) {
        trajectory.shift();
      }
      trajectory.push(rainbowified);
    }
  }

  /**
   * Main draw function to draw the output of the reporter
   */
  draw(): void {
    this.appendRainbow();
    this.drawScoreboard();
    this.drawRainbow();
    this.drawNyanCat();

    this.tick = !this.tick;
  }

  /**
   * Draw the Nyan Cat
   *
   * @private
   */
  drawNyanCat = (): void => {
    const startWidth = this.scoreboardWidth + this.trajectories[0].length;
    const dist = '\u001b[' + startWidth + 'C';
    let padding = '';

    write(dist);
    write('_,------,');
    write('\n');

    write(dist);
    padding = this.tick ? '  ' : '   ';
    write('_|' + padding + '/\\_/\\ ');
    write('\n');

    write(dist);
    padding = this.tick ? '_' : '__';
    const tail = this.tick ? '~' : '^';
    write(tail + '|' + padding + this.face() + ' ');
    write('\n');

    write(dist);
    padding = this.tick ? ' ' : '  ';
    write(padding + '""  "" ');
    write('\n');

    this.cursorUp(this.numberOfLines);
  };

  face(): string {
    const { numPassedTests, numFailedTests, numPendingTests } = this.totalResults;
    if (numFailedTests) {
      return '( x .x)';
    } else if (numPendingTests) {
      return '( o .o)';
    } else if (numPassedTests) {
      return '( ^ .^)';
    }
    return '( - .-)';
  }

  /**
   * Draw the rainbow
   */
  drawRainbow(): void {
    this.trajectories.forEach((line) => {
      write('\u001b[' + this.scoreboardWidth + 'C');
      write(line.join(''));
      write('\n');
    });

    this.cursorUp(this.numberOfLines);
  }

  rainbowify(str: string): string {
    if (!supportsColor) {
      return str;
    }

    const color = this.rainbowColors[this.colorIndex % this.rainbowColors.length];
    this.colorIndex += 1;
    return '\u001b[38;5;' + color + 'm' + str + '\u001b[0m';
  }

  /**
   * Move cursor up `n`
   *
   * @private
   * @param {number} n
   */
  cursorUp(n: number): void {
    write('\u001b[' + n + 'A');
  }

  /**
   * Move cursor down `n`
   */
  cursorDown(n: number): void {
    write('\u001b[' + n + 'B');
  }
}

export default NyanReporter;
