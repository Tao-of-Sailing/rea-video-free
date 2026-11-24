import { assertAttributes, assertEmptyElement, createMarkupSurfaceFacet, textAttribute } from "@hypit/hypit/markup";
import { canonicalize, sameType } from "@hypit/hypit/protocol";
import { sealGraphFragment } from "@hypit/hypit/author";
import { createAdmissionPackageFacet } from "@hypit/hypit/admission";
import { createProducerPackageFacet } from "@hypit/hypit/producer";
import { recipeType } from "@hypit/hypit/recipe";
import { compositionTypes } from "@hypit/composition";
import { timelineTypes } from "@hypit/timeline";
import { spatialTypes } from "@hypit/spatial";
import { resolveTemporalContext, temporalContextAttributeVocabulary } from "@hypit/temporal/markup";
import { renderMinimalCaptions } from "./render.js";

const moduleRef = { name: "minimal-captions", version: "1" };
const optionsType = { module: moduleRef, name: "CaptionOptions" };
const captionsProducer = { module: moduleRef, name: "render-captions" };

const captionsInputs = [
  { name: "timeline", type: timelineTypes.timeline },
  { name: "within", type: spatialTypes.frame },
  { name: "style", type: recipeType },
  { name: "options", type: optionsType },
];

export const manifest = {
  format: "hypit.module@1",
  ...moduleRef,
  dependencies: [
    compositionTypes.visualTrack.module,
    timelineTypes.timeline.module,
    spatialTypes.frame.module,
    recipeType.module,
  ].map((m) => ({ module: m })),
  types: [{ name: optionsType.name }],
  capabilities: [],
  producers: [
    { name: captionsProducer.name, inputs: captionsInputs, outputs: [{ name: "visual", type: compositionTypes.visualTrack }], needs: [] },
  ],
};

const captionsFragment = sealGraphFragment({
  inputs: captionsInputs,
  operations: [{
    id: "render",
    producer: captionsProducer,
    inputs: Object.fromEntries(captionsInputs.map((i) => [i.name, { kind: "fragment-input", name: i.name }])),
    result: { kind: "output", name: "visual" },
  }],
  exports: [{ name: "visual", type: compositionTypes.visualTrack, root: { kind: "fragment-operation", operation: "render" } }],
});

const inline = (record, name) => {
  if (record?.value?.kind !== "inline") throw new Error(`${name} must be an inline value.`);
  return record.value.value;
};

const component = {
  producers: [
    {
      producer: captionsProducer,
      handler: ({ inputs }) => ({
        needs: {},
        outputs: {
          visual: {
            kind: "inline",
            value: canonicalize(renderMinimalCaptions(
              inline(inputs.timeline, "timeline"),
              inline(inputs.within, "within"),
              inline(inputs.style, "style").properties || {},
              inline(inputs.options, "options"),
            )),
          },
        },
      }),
    },
  ],
};

function resolveRef(element, name, expectedType, resolveReference) {
  const raw = element.attributes[name];
  if (typeof raw !== "object" || raw.kind !== "reference") throw new Error(`${element.name}.${name} must be a reference.`);
  const value = resolveReference(raw.path);
  if (value === undefined || !sameType(expectedType, value.type)) throw new Error(`${element.name}.${name} has the wrong type.`);
  return value;
}

const decodeCaptions = ({ element, resolveReference }) => {
  assertAttributes(element, ["id", "timeline", "within", "style", "stack-order"]);
  assertEmptyElement(element);
  const id = textAttribute(element, "id");
  const context = resolveTemporalContext({ element, resolveReference });
  const within = resolveRef(element, "within", spatialTypes.frame, resolveReference);
  const style = resolveRef(element, "style", recipeType, resolveReference);
  const options = { id, stackingOrder: Number(textAttribute(element, "stack-order")) };
  return {
    records: [{ id: `${id}.options`, type: optionsType, value: { kind: "inline", value: canonicalize(options) }, range: element.range }],
    fragments: [captionsFragment],
    components: [{
      id,
      fragment: captionsFragment.id,
      inputs: {
        timeline: context.timeline.ref,
        within: within.ref,
        style: style.ref,
        options: { kind: "record", id: `${id}.options` },
      },
      outputs: { visual: `${id}.visual` },
      range: element.range,
    }],
    exports: [`${id}.visual`],
  };
};

const captionsDecl = {
  name: "captions",
  tag: "Captions",
  mode: "structured",
  outputs: [compositionTypes.visualTrack, optionsType],
  vocabulary: {
    summary: "Outlined bilingual subtitle track driven by SVS course.caption tokens.",
    attributes: [
      { name: "id", kind: "literal", required: true, summary: "Track id" },
      { name: "stack-order", kind: "literal", required: true, summary: "Layer z-index" },
      ...temporalContextAttributeVocabulary,
      { name: "within", kind: "reference", required: true, accepts: [spatialTypes.frame], summary: "Canvas frame" },
      { name: "style", kind: "reference", required: true, accepts: [recipeType], summary: "Caption SVS recipe" },
    ],
    ports: [{ name: "visual", type: compositionTypes.visualTrack, summary: "Captions visual track" }],
  },
};

export const hypitPackage = {
  format: "hypit.package@1",
  modules: [{ manifest }],
  facets: [
    createProducerPackageFacet(component),
    createAdmissionPackageFacet(component),
    createMarkupSurfaceFacet({ module: moduleRef, declaration: captionsDecl, handler: decodeCaptions }),
  ],
};

export default hypitPackage;
