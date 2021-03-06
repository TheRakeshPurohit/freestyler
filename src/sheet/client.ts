import createStyleElement from '../client/createStyleElement';
import removeElement from '../client/removeElement';
import {TAtrulePrelude, TSelectors, TDeclarations} from '../ast/toStylesheet';
import toCss from '../ast/toCss';

let SHEET_ID = 0;

type TMapBySelectors = {[selectors: string]: ClientRule};
type TMapByAtRulePrelude = {[atRulePrelude: string]: TMapBySelectors};

export class ClientRule {
    style: CSSStyleDeclaration;
    decl: TDeclarations = null;
    className: string = '';

    constructor(style: CSSStyleDeclaration) {
        this.style = style;
    }

    put(declarations: TDeclarations, important?: boolean) {
        const {style} = this;
        const len = declarations.length;
        const imp = important ? 'important' : '';

        this.decl = declarations;
        for (let i = 0; i < len; i++) style.setProperty.call(style, declarations[i][0], declarations[i][1], imp);
    }

    putRaw(rawCss: string) {
        this.style.cssText = rawCss;
    }

    trunc() {
        this.decl = null;
        this.style.cssText = '';
    }
}

export class ClientSheet {
    el: HTMLStyleElement = createStyleElement();
    map: TMapBySelectors | TMapByAtRulePrelude = {};
    id: string = (SHEET_ID++).toString(36);

    get(atRulePrelude: TAtrulePrelude, selectors: TSelectors): ClientRule {
        const {map} = this;

        return !atRulePrelude ? (map[selectors] as ClientRule) : map[atRulePrelude] && map[atRulePrelude][selectors];
    }

    add(
        atRulePrelude: TAtrulePrelude,
        selectors: string,
        declarations,
        important?: boolean,
        selectorTemplate?: string
    ): ClientRule {
        const sheet = this.el.sheet as CSSStyleSheet;
        const {cssRules} = sheet;
        const {length} = cssRules;
        let rule: ClientRule;

        if (atRulePrelude) {
            sheet.insertRule(`${atRulePrelude}{${selectors}{}}`, length);
            rule = new ClientRule(((cssRules[length] as CSSGroupingRule).cssRules[0] as CSSStyleRule).style);
        } else {
            sheet.insertRule(`${selectors}{}`, length);
            // TODO: Benchmark `cssRules[length]` vs `cssRules.item(length)`.
            rule = new ClientRule((cssRules[length] as CSSStyleRule).style);
        }

        rule.put(declarations, important);

        if (selectorTemplate) this.cache(atRulePrelude, selectorTemplate, rule);

        return rule;
    }

    cache(atRulePrelude: TAtrulePrelude, selectorTemplate: string, rule: ClientRule) {
        if (atRulePrelude) {
            if (!this.map[atRulePrelude]) {
                this.map[atRulePrelude] = {};
            }
            this.map[atRulePrelude][selectorTemplate] = rule;
        } else {
            this.map[selectorTemplate] = rule;
        }
    }

    addRaw(rawCss: string): ClientRule {
        const sheet = this.el.sheet as CSSStyleSheet;
        const {cssRules} = sheet;

        sheet.insertRule(rawCss);

        return null;
        // return new ClientRule((cssRules[length] as CSSStyleRule).style);
    }

    destroy() {
        removeElement(this.el);
    }
}
