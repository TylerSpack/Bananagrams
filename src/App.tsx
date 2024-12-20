import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

// Stuff I added
import Host from './pages/Host';
import Guest from './pages/Guest';
import Home from './pages/Home';
import { auth } from './firebase/firebaseConfig';
import { useEffect, useState } from 'react';
import TestPlayer from './pages/TestPlayer';


setupIonicReact();

const App: React.FC = () => {
  const [rerenderKey, setRerenderKey] = useState(0);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setRerenderKey((prev) => prev + 1);
      }
    });
    return () => unsubscribe();

  }, [auth]);

  return (
    <IonApp key={rerenderKey}>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/home" component={Home} />
          <Route exact path="/host/:sessionID" component={Host} />
          <Route exact path="/guest/:sessionID" component={Guest} />
          <Route exact path="/TestBoard" component={TestPlayer} />
          <Redirect exact from="/" to="/home" />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>);
}

export default App;
