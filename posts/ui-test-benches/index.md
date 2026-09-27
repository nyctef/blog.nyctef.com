---
title: Isolated testing for UI components with test benches
original: https://medium.com/ingeniouslysimple/isolated-testing-for-ui-components-with-test-benches-b0d55d23a3d8?source=friends_link&sk=9f044f166b1158279d41180bd425769b
date: 2018-12-18
---

![](https://cdn-images-1.medium.com/max/800/0*fEkOT3qt8rEsuEtw.jpeg)

Testing an aircraft component on a test bench at Nellis Air Force Base ([https://catalog.archives.gov/id/6388152](https://catalog.archives.gov/id/6388152))

#### Manual testing without all the fuss

Testing a UI-driven application can often be extremely frustrating, especially when the problem being investigated is at the end of a long process. Repeatedly bringing the UI up, following a dozen steps to get the UI into the right state, and then tweaking one little thing to check the next test case is a sure path to madness!

Fortunately, there is often a better way. By having a way to display UI components (or small sections of the UI) by themselves, independently of the application that they’re a part of, a lot of testing can be done with a much faster cycle time.

Like the aircraft component in the above picture, there are three main steps to make this work:

- The component needs to be capable of being isolated from the whole application
- The inputs to the component need to be controllable programmatically, so that different situations can quickly be set up and tested
- The outputs of the component need to be easily accessed or visualized, to make verifying correct behavior of the component easy

If all three of these are true, we can pull the component out of the main application and wrap it in a mini-application (or “test bench”) whose sole purpose is to display and control the component under test.

As well as speeding up testing in a lot of cases, creating test benches can also make it much easier to put a UI component into error states or trigger edge cases that would be much trickier (or even which should be impossible) to create in the actual application. This can provide greater confidence in the component; it helps to be reasonably sure that, if an unexpected error does happen, the component won’t fall apart in an unpredictable way.

Building test benches also potentially allows the initial development on UI components to happen independently of the application that they’re part of, or the container elements that they’ll eventually slot into. This may allow parallel development on UI components between different members of a team, but requires a strong plan for which UI components will be needed up-front.

#### Building .NET test benches with WPF and NUnit

One way to build test benches is to have each individual case to test as a separate test. The test can set up the component’s state, provide any dependencies as required and then display the component inside a WPF `Application`. Here’s one example of the kind of tests we wrote for SQL Compare which follow this pattern:

```
[Test, Explicit]
public void ShowWithDetails()
{
    var viewmodel = new MessageBoxViewModel(
        onReportError: () => MessageBox.Show("Report clicked"))
    {
        WindowTitle = "SQL Compare 11",
        FriendlyMessage = "Unable to connect to server. " +
            "It may be on fire. " +
            "This message is long enough to wrap onto 2 lines.",
        HasSendReportLink = true,
    };

    var view = new ErrorWindow { DataContext = viewmodel };

    new Application().Run(view);
}
```

This test sets up an `ErrorWindow` component to display a particular error message. The text passed in is designed to wrap in the actual component, so we check that everything is displayed correctly. Additionally, we pass in a fake handler for the “report error” event. By clicking on the “report error” button and then checking that the message box from the `MessageBox.Show()` call appears, we can verify that the button is correctly hooked up to the viewmodel handler.

Finally, we make the test `Explicit` so that it isn’t triggered automatically as part of the normal test run.

#### Building web test benches with React

One way to build test benches is to actually make them part of the main application. We did this for one of our React apps because it simplifies a lot of the setup — not having to create a separate application with its own webpack config and so on was rather nice.

The way we implemented this was to have a switch at the top level component, based on the URL:

```
function render() {
  const pathParts = window.location.pathname.split('/');

  if (pathParts[1] === 'benches') {
    const benchName = pathParts[2];
    ReactDOM.render(<Benches benchName={benchName} />,
                    document.getElementById('app'));
  } else {
    ReactDOM.render(<App />,
                    document.getElementById('app'));
  }
}
```

Because the `/benches/` path isn’t linked to from anywhere in the app (and we package this website up as an electron app, so the URL isn’t visible) we can be confident that the benches are effectively hidden from any end users.

The `Benches` component renders a UI which lets the user pick from one of the available test benches and then displays the appropriate test bench.

The actual test benches themselves are a bit different in this project: instead of picking from one of many tests to run to bring up the component in a specific state, we end up with something a bit more interactive:

![](https://cdn-images-1.medium.com/max/800/1*5qsR6KDzTOORSIGsviJ1AQ.gif)

Interacting with a simple test bench for a button component

This test bench has three parts. Firstly, we have some checkboxes which control the inputs to the component:

```
<div className="controls">
  <input id="primary" type="checkbox"
    onChange={e => this.setState({ primary: e.target.checked })} />
  <label htmlFor="primary">Primary</label>

  <input id="disabled" type="checkbox"
    onChange={e => this.setState({ disabled: e.target.checked })} />
  <label htmlFor="disabled">Disabled</label>
</div>
```

and on the right we have a simple log which records output from the component:

```
<div className="log">
  {this.state.logEntries.map((log, i) => <div key={i}>{log}</div>)}
</div>
```

Finally, on the left we render the component itself. We control its props with the state from the checkboxes, and hook up events to trigger new log entries:

```
<div className="element-under-test">
  <Button
    text="this is a button"
    primary={this.state.primary}
    disabled={this.state.disabled}
    onClick={() => this.addLogEntry('button clicked')}
  />
</div>
```

This test bench lets us check two important facts about the button: it renders correctly (and looks correct to a human) for all possible combinations of props that might be set, and it calls the `onClick` handler correctly when the button is clicked (but only if the button isn’t disabled).

#### Alternatives

This isn’t the only way of testing UIs, of course. We’ve been looking into using [AppraiseQA/appraise](https://github.com/AppraiseQA/appraise) for a more automated testing of how a component looks — by capturing screenshots of rendered components and flagging any changes for human review, appraise can give confidence that no unexpected changes to the component’s appearance have happened.

It’s also possible to test some of the same UI behaviors (such as buttons not raising a click event when disabled) through React unit tests with [enzyme](https://airbnb.io/enzyme/). This does have some disadvantages, though — in the button example, for instance, we’re relying on the [HTML button’s disabled attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#Attributes) to implement that behavior, so we’d need to use full DOM rendering and potentially be coupled to jsdom or another browser.

The big advantage of test benches compared to automated tests is around how easy it is to play and experiment with the component being tested.

#### Summing up

Test benches are a useful technique, but they aren’t a cure-all by any means. They require strongly isolated UI components to be built, which may be hard (especially depending on the UI framework being used).

They also only test components in an isolated manner (by their very nature) and so won’t surface any issues around data flowing between different components. Ideally a lot of the data flow can be pulled away from the UI layer and tested with more standard unit tests, but this still leaves some holes that need to be tested.

In the end, there will always be some times that you have to spin up the entire application in order to test some feature or issue. But with a variety of testing tools, we can keep those occasions limited to only when they’re absolutely necessary.
