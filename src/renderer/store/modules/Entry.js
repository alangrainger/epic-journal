const state = {
  entry: {}
}

const mutations = {
  NEW_ENTRY (state) {
    state.entry = {
      id: null,
      date: null,
      content: null
    }
  },
  SET_ENTRY (state, data) {
    state.entry = data
  }
}

const actions = {
  setEntry ({commit}, data) {
    commit('SET_ENTRY', data)
  }
}

export default {
  state,
  mutations,
  actions
}
