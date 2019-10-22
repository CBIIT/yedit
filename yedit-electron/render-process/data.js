const d3 = require('d3')
const yaml = require('yaml')
console.log(__dirname, __filename)
const ydoci = require('./ydoci.js')
const ytypes = require('yaml/types')
const _ = require('lodash')

// ydoc isa yaml.Document

// create new document
function render_data(ydoc) {
  if ( ! ydoc instanceof yaml.Document ) {
    console.error( "render_data() - arg must be yaml.Document object")
    return
  }
  if (!ydoc.instrumented) {
    ydoci.instrument_ydoc(ydoc)
  }
  // let yh = d3.hierarchy( ydoc.contents, children )

  d3.select('div[data-node-id="container"')
    .datum({id: 'container',parent_id:'container'})
  ydoc.order.forEach( (d) => {
    d3.selectAll(`div[data-node-id=${d.parent_id}`) // this one exists
      .selectAll(`div[data-node-id=${d.id}`) // this one doesn't yet
      .data([d], dd => dd.id)
      .enter()
      .append(
        function (d) {
          let p, ptype
          if (d.parent_id=='container') {
            ptype = 'CONTAINER'
          }
          else {
            p = ydoc.get_parent_by_id(d.id)
            ptype = p ? p.type : null
          }
          return create_from_yaml_node(d,ptype)
        }
      )
  })
}

// update current document and return list of new dom nodes
function update_data(ydoc) {
  let new_nodes = []
  if ( ! ydoc instanceof yaml.Document ) {
    console.error( "update_data() - arg must be yaml.Document object")
    return
  }
  if (!ydoc.instrumented) {
    console.error( "update_data() - yaml.Document not instrumented for id updates (use instrument_ydoc())");
    return
  }
  d3.selectAll('div[data-node-id]')
    .data(ydoc.order, d => { return d.id })
    .join(
      enter => {
        enter
          .each(
            function (d) {
              let p, ptype
              if (d.parent_id=='container') {
                ptype = 'CONTAINER'
              }
              else {
                p = ydoc.get_parent_by_id(d.id)
                ptype = p ? p.type : null
              }
              let node = create_from_yaml_node(d,ptype)
              if (d.sib_id) {
                d3.select(`div[data-node-id='${d.sib_id}'`)
                  .each( function () {
                    let sib = this
                    // note, select() in next call, plus the insert(),
                    // will push the data
                    // from the parent MAP down to the PAIR - yaml-obj-ent
                    // -- this is not desired, want 'node' to preserve
                    // the data already assigned to it in create_node_from_yaml
                    d3.selectAll(`div[data-node-id='${d.parent_id}'`)
                      .insert( ()=>{return node}, () => { return sib } )
                    // kludge it by resetting .__data__,
                    // although this is done in create_from_yaml_node
                    node.__data__ = d
                  })
              }
              else {
                d3.selectAll(`div[data-node-id='${d.parent_id}'`)
                  .append(() => {return node})
                // kludge it by resetting .__data__,
                // although this is done in create_from_yaml_node
                node.__data__ = d
              }
              new_nodes.push(node)
              return true
            }
          )        
      },
      update => { return },
      exit => {
        exit
          .filter(":not([data-node-id='container'])")
          .remove()
      }
    )
  return new_nodes
}


function create_from_yaml_node(d, parentType) {
  elt = document.createElement("div")
  elt.setAttribute('data-node-id',d.id)
  switch (d.type) {
  case 'PAIR':
    elt.innerHTML =
      '<span class="yaml-obj-ent-control"></span>'+
      `<input class="yaml-obj-key" value="${d.key.value}">`+
      '<span class="yaml-obj-val-mrk">:</span>'+
      '<span class="yaml-status"></span>'
    elt.setAttribute('class','yaml-obj-ent')
    break
  case 'SEQ':
    elt.setAttribute('class', 'yaml-arr yaml-entity')
    if (parentType == 'PAIR') {
      let wrap = document.createElement("div")
      wrap.setAttribute('class','yaml-obj-val')
      wrap.append(elt)
      elt = wrap
    }
    break
  case 'MAP':
    elt.setAttribute('class','yaml-obj yaml-entity')
    if (parentType == 'PAIR') {
      let wrap = document.createElement("div")
      wrap.setAttribute('class','yaml-obj-val')
      wrap.append(elt)
      elt = wrap
    }
    break
  case 'PLAIN':
    let scl;
    switch (parentType) {
    case 'SEQ':
      elt.innerHTML =
        '<span class="yaml-arr-elt-mrk">-</span>'+
        `<input class="yaml-ptext" value="${d.value}">`+
        '<span class="yaml-status"></span>'+
        '<span class="yaml-arr-elt-control"></span>'
      elt.setAttribute('class','yaml-arr-elt')
      break
    case 'PAIR':
      elt.innerHTML =
        `<input class="yaml-ptext" value="${d.value}">`
      elt.setAttribute('class','yaml-scalar')
      break
    default:
      console.error(`Can't handle PLAIN scalar at this position`)
    }
    break
  default:
    console.error(`Can't handle ${d.type} at this position`)
  }
  elt.__data__ = d
  for ( let i=0; i<elt.children.length ; i++) {
    elt.children[i].__data__ = d
  }
  return elt
}

function children (n) {
  switch (n.type) {
  case 'PAIR':
    // console.log('pair')
    return [n.value]
    break
  case 'MAP':
    // console.log('map')
    return n.items
  case 'SEQ':
    // console.log('seq')
    return n.items
  default:
    // console.log('>>',n.type)
    return null
  }
}



exports.render_data=render_data
exports.update_data=update_data
