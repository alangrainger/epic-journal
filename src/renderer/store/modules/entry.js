const state = {
  id: null,
  date: null,
  content: null
}

const mutations = {
  NEW_ENTRY (state) {
    state.id = null
    state.date = null
    state.content = null
  },
  SET_FIELD (state, key, value) {
    state[key] = value
  }
}

const actions = {
  setEntry ({commit}, data) {
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        commit('SET_FIELD', key, data[key])
      }
    }
  }
}

export default {
  state,
  mutations,
  actions
}
