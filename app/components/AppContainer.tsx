import {connect} from 'react-redux'
import {AppState, EditorState, QuestType} from '../reducers/StateTypes'
import App, {AppDispatchProps, AppStateProps} from './App'
import {renderXML} from '../parsing/QDL'
import {QDLRenderer} from '../parsing/QDLRenderer'

import {initQuest, loadNode} from 'expedition-app/app/actions/quest'
import {loadQuestXML} from 'expedition-app/app/actions/web'
import {toCard} from 'expedition-app/app/actions/card'

const mapStateToProps = (state: AppState, ownProps: any): AppStateProps => {
  return {
    editor: state.editor,
    quest: state.quest,
  };
}


const mapDispatchToProps = (dispatch: Redux.Dispatch<any>, ownProps: any): AppDispatchProps => {
  return {
    playFromCursor: (editor: EditorState, quest: QuestType) => {
      renderXML(quest.mdRealtime.getText(), function(qdl: QDLRenderer) {
        var newNode = qdl.getResultAt(editor.line);
        var tag = newNode.get(0).tagName;
        if (tag === 'roleplay' || tag === 'combat') {
          dispatch({type: 'REBOOT_APP'});
          dispatch(toCard('QUEST_START'));
          loadNode({numPlayers: 1, difficulty: "NORMAL", showHelp: true, multitouch: false}, dispatch, newNode);
        }
      });
    },
    playFromStart: (editor: EditorState, quest: QuestType) => {
      renderXML(quest.mdRealtime.getText(), function(qdl: QDLRenderer) {
        dispatch({type: 'REBOOT_APP'});
        dispatch(initQuest(qdl.getResult().children().eq(0)));
        dispatch(toCard('QUEST_START'));
      });
    }
  };
}

const AppContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(App);

export default AppContainer;