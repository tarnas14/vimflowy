const closest = (node, selector) => {
  let element = node
  while(element && !element.matches(selector)) {
    element = element.parentNode
  }

  return element
}

const NODE_TYPES = {
  ELEMENT: 1,
  TEXT: 3
}

const getContentAbstraction = node => {
  const contentElement = closest(node, '.content')

  const getNodes = element => [...element.childNodes].reduce((accu, current) => {
    if (current.nodeType === NODE_TYPES.TEXT) {
      return [...accu, current]
    }

    if (current.nodeType === NODE_TYPES.ELEMENT) {
      return [...accu, ...getNodes(current)]
    }

    console.log(`I did not expect this nodetype: ${current.nodeType} in this element`, current)
  }, [])

  const nodes = getNodes(contentElement)

  return {
    get length() { return nodes.reduce((accu, current) => accu + current.length, 0) },
    setCursorAt: function (offset) {
      for(let i = 0; i < nodes.length; ++i) {
        const node = nodes[i]

        if (offset < node.length) {
          const range = document.createRange()
          range.setStart(node, offset)
          range.collapse(true)
          const selection = document.getSelection()
          selection.removeAllRanges()
          selection.addRange(range)
          selection.modify('extend', 'right', 'character')
          contentElement.focus()
          return
        }

        offset -= node.length
      }
    }
  }
}

const projectAncestor = project => closest(project, `.project:not([projectid='${project.getAttribute('projectid')}'])`)

const moveAboveFold = element => {
  const rect = element.getBoundingClientRect()
  const fold = window.innerHeight
  const scrollPosition = window.scrollY
  const beyondFold = rect.top >= fold || (rect.top < fold && rect.bottom > fold)
  const floatingHeaderHeight = 30
  const aboveViewport = rect.top < floatingHeaderHeight

  if (!beyondFold && !aboveViewport) {
    return
  }

  element.scrollIntoView()
  if (aboveViewport) {
    window.scrollBy(0, -floatingHeaderHeight)
  }
}

const setCursorAfterVerticalMove = (calculateOffset, cursorTargetProject) => {
  const cursorTarget = cursorTargetProject.querySelector('.name>.content')

  if (!cursorTarget.childNodes.length) {
    cursorTarget.append(' ')
  }

  const abstraction = getContentAbstraction(cursorTarget)
  const offset = calculateOffset(abstraction, o => o)
  abstraction.setCursorAt(offset)

  moveAboveFold(cursorTarget)
}

const moveCursorDown = startElement => {
  const project = projectAncestor(startElement)

  if (project.className.includes('open')) {
    return project.querySelector('.project')
  }

  let cursorTargetProject = project
  while(!(cursorTargetProject.nextElementSibling && cursorTargetProject.nextElementSibling.className.includes('project'))) {
    const ancestor = projectAncestor(cursorTargetProject)

    if (ancestor.className.includes('mainTreeRoot')) {
      return project
    }
    cursorTargetProject = ancestor
  }

  return cursorTargetProject.nextElementSibling
}

const moveCursorUp = t => {
  const project = projectAncestor(t) 
  let cursorTarget = null

  if (project.previousElementSibling) {
    cursorTarget = project.previousElementSibling
    if (cursorTarget.className.includes('open')) {
      const textContainers = cursorTarget.querySelectorAll('.project')
      cursorTarget = textContainers[textContainers.length - 1]
    }
  }

  if (!cursorTarget) {
    cursorTarget = projectAncestor(project) 
  }

  return cursorTarget.className.includes('mainTreeRoot')
    ? project
    : cursorTarget
}

const setCursorAt = (offset) => {
  const selection = document.getSelection()
  const {anchorOffset, baseNode} = selection
  let effectiveOffset = offset

  if (typeof offset === 'function') {
    effectiveOffset = offset(anchorOffset, baseNode)
  }

  effectiveOffset = Math.min(effectiveOffset, baseNode.length - 1)
  effectiveOffset = Math.max(effectiveOffset, 0)

  state.set(_ => ({
    anchorOffset: effectiveOffset
  }))

  const range = document.createRange()
  range.setStart(baseNode, effectiveOffset)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  selection.modify('extend', 'right', 'character')
  baseNode.parentElement.focus()
}

const moveCursorToStart = (target, calculateOffset) => {
  const contentAbstraction = getContentAbstraction(target)
  const offset = calculateOffset(contentAbstraction, () => 0)
  contentAbstraction.setCursorAt(0)
}

const moveCursorToEnd = (target, calculateOffset) => {
  const contentAbstraction = getContentAbstraction(target)
  const offset = calculateOffset(contentAbstraction, () => contentAbstraction.length - 1)
  contentAbstraction.setCursorAt(offset)
}

const moveCursorLeft = (target, calculateOffset) => {
  const contentAbstraction = getContentAbstraction(target)
  const offset = calculateOffset(contentAbstraction, o => o - 1)
  contentAbstraction.setCursorAt(offset)
}

const moveCursorRight = (target, calculateOffset) => {
  const contentAbstraction = getContentAbstraction(target)
  const offset = calculateOffset(contentAbstraction, o => o + 1)
  contentAbstraction.setCursorAt(offset)
}

if (typeof module !== 'undefined') {
  module.exports = {
    moveCursorLeft,
    moveCursorRight,
    moveCursorDown,
    moveCursorUp
  }
}
