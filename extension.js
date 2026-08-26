"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;

const vscode = require("vscode");

function activate(context) {
    console.log("Selection Statistics is now active!");

    const wordCounter = new WordCounter();
    const controller = new WordCounterController(wordCounter);

    context.subscriptions.push(controller);
    context.subscriptions.push(wordCounter);

    const copyCommand = vscode.commands.registerCommand(
        "selectionStatistics.copyResult",
        async () => {
            const stats = wordCounter.lastStats;

            if (!stats) {
                return;
            }

            const text = wordCounter.formatForClipboard(stats);

            await vscode.env.clipboard.writeText(text);

            vscode.window.setStatusBarMessage(
                "Statistics copied to clipboard",
                2000
            );
        }
    );

    context.subscriptions.push(copyCommand);
}

class WordCounter {
    constructor() {
        this._statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left
        );

        this._statusBarItem.command = "selectionStatistics.copyResult";

        this.lastStats = null;
    }

    getConfig() {
        const cfg = vscode.workspace.getConfiguration("selectionStatistics");

        return {
            locale: cfg.get("locale", "en-US"),
            displayDecimals: cfg.get("displayDecimals", 2),
            exportDecimals: cfg.get("exportDecimals", 8),
            copyFormat: cfg.get("copyFormat", "text")
        };
    }

    formatNumber(num, decimals) {
        const { locale } = this.getConfig();

        return num.toLocaleString(locale, {
            useGrouping: false,
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals
        });
    }

    getMedian(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);

        const middle = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }

        return sorted[middle];
    }

    createStatistics(numList, lineCnt) {
        const [minNum, maxNum, sumNum] = numList.reduce(
            ([min, max, sum], num) => [
                Math.min(min, num),
                Math.max(max, num),
                sum + num
            ],
            [numList[0], numList[0], 0]
        );

        const avgNum = sumNum / numList.length;
        const medianNum = this.getMedian(numList);

        return {
            lines: lineCnt,
            count: numList.length,
            sum: sumNum,
            avg: avgNum,
            median: medianNum,
            min: minNum,
            max: maxNum
        };
    }

    formatForStatusBar(stats) {
        const { displayDecimals } = this.getConfig();

        return {
            sum: this.formatNumber(stats.sum, displayDecimals),
            avg: this.formatNumber(stats.avg, displayDecimals),
            median: this.formatNumber(stats.median, displayDecimals),
            min: this.formatNumber(stats.min, displayDecimals),
            max: this.formatNumber(stats.max, displayDecimals)
        };
    }

    formatForClipboard(stats) {
        const config = this.getConfig();

        switch (config.copyFormat) {
            case "csv":
                return this.toCsv(stats);

            case "json":
                return this.toJson(stats);

            default:
                return this.toText(stats);
        }
    }

    toText(stats) {
        const { exportDecimals } = this.getConfig();

        return [
            `Lines: ${stats.lines}`,
            `Count: ${stats.count}`,
            `Sum: ${this.formatNumber(stats.sum, exportDecimals)}`,
            `Avg: ${this.formatNumber(stats.avg, exportDecimals)}`,
            `Median: ${this.formatNumber(stats.median, exportDecimals)}`,
            `Min: ${this.formatNumber(stats.min, exportDecimals)}`,
            `Max: ${this.formatNumber(stats.max, exportDecimals)}`
        ].join("\n");
    }

    toCsv(stats) {
        return [
            "lines,count,sum,avg,median,min,max",
            [
                stats.lines,
                stats.count,
                stats.sum,
                stats.avg,
                stats.median,
                stats.min,
                stats.max
            ].join(",")
        ].join("\n");
    }

    toJson(stats) {
        return JSON.stringify(stats, null, 2);
    }

    updateWordCount() {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        const lineCnt = editor.selections.reduce(
            (pre, selection) =>
                pre +
                selection.end.line -
                selection.start.line +
                (selection.end.character === 0 ? 0 : 1),
            0
        );

        const text = editor.selections
            .map(selection => editor.document.getText(selection))
            .join("\n");

        const numList = this._getNumList(text);

        if (numList.length === 0) {
            this.lastStats = null;
            this._statusBarItem.hide();
            return;
        }

        const stats = this.createStatistics(numList, lineCnt);

        this.lastStats = stats;

        const formatted = this.formatForStatusBar(stats);

        this._statusBarItem.text =
            `$(calculator) Σ ${formatted.sum} | μ ${formatted.avg} | n ${stats.count}`;

        this._statusBarItem.tooltip =
            `Click to copy\n\n` +
            `Lines: ${stats.lines}\n` +
            `Count: ${stats.count}\n` +
            `Sum: ${formatted.sum}\n` +
            `Average: ${formatted.avg}\n` +
            `Median: ${formatted.median}\n` +
            `Min: ${formatted.min}\n` +
            `Max: ${formatted.max}`;

        this._statusBarItem.show();
    }

    _getNumList(text) {
        const regex =
            /[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

        return (text.match(regex) || []).map(Number);
    }

    dispose() {
        this._statusBarItem.dispose();
    }
}

class WordCounterController {
    constructor(wordCounter) {
        this._wordCounter = wordCounter;

        const subscriptions = [];

        vscode.window.onDidChangeTextEditorSelection(
            this._onEvent,
            this,
            subscriptions
        );

        vscode.window.onDidChangeActiveTextEditor(
            this._onEvent,
            this,
            subscriptions
        );

        vscode.workspace.onDidChangeTextDocument(
            this._onEvent,
            this,
            subscriptions
        );

        vscode.workspace.onDidChangeConfiguration(
            e => {
                if (e.affectsConfiguration("selectionStatistics")) {
                    this._wordCounter.updateWordCount();
                }
            },
            null,
            subscriptions
        );

        this._wordCounter.updateWordCount();

        this._disposable = vscode.Disposable.from(
            ...subscriptions
        );
    }

    _onEvent() {
        this._wordCounter.updateWordCount();
    }
}