const state = {
  element: null
}

const getters = {
  getElement: state => {
    return state.element
  }
}

const mutations = {
  CAPTURE_EVENT (state, element) {
    console.log(element)
    state.element = element
  }
}

const actions = {
  captureEvent ({ commit }, element) {
    commit('CAPTURE_EVENT', element)
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
