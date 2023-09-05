import mermaid from 'mermaid';
import utils from '../utils';

const config = {
    logLevel: 5,
    startOnLoad: false,
    arrowMarkerAbsolute: false,
    theme: 'base',
    securityLevel: "strict",
    themeVariables: {
        primaryColor: '#464646',
        primaryTextColor: '#fff',
        // primaryBorderColor: '#7C0000',
        lineColor: '#84FFFF',
        secondaryColor: '#00E5FF',
        tertiaryColor: '#536DFE',
        noteBkgColor: '#84FFFF',
        noteTextColor: '#121212'
    },
    flowchart: {
        htmlLabels: true,
        curve: 'linear',
    },
    sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        bottomMarginAdj: 1,
        useMaxWidth: true,
    },
    gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        barGap: 4,
        topPadding: 50,
        leftPadding: 75,
        gridLineStartPadding: 35,
        fontSize: 11,
        fontFamily: '"Open-Sans", "sans-serif"',
        numberSectionStyles: 4,
        axisFormat: '%Y-%m-%d',
    },
};

const containerElt = document.createElement('div');
containerElt.className = 'hidden-rendering-container';
document.body.appendChild(containerElt);

let init = () => {
    mermaid.initialize(config);
    init = () => { };
};

const render = async (elt) => {
    init();
    const svgId = `mermaid-svg-${utils.uid()}`;

    mermaid.mermaidAPI.renderAsync(svgId, elt.textContent, () => {
        while (elt.firstChild) {
            elt.removeChild(elt.lastChild);
        }

        const el = containerElt.querySelector('#' + svgId)
        elt.appendChild(el);
    }, containerElt)
        .catch(e => {
            // In the event of an invalid mermaid chart, render the section with an error message.
            elt.innerHTML = `<pre>${e.message}</pre>`;
        });

};

export default (extensionSvc) => {

    extensionSvc.onGetOptions((options, properties) => {
        options.mermaid = properties.extensions.mermaid.enabled;
    });

    extensionSvc.onSectionPreview((elt) => {
        elt.querySelectorAll('.prism.language-mermaid')
            .cl_each(diagramElt => render(diagramElt.parentNode));
    });

};
